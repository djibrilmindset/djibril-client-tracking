-- Tracking Djibril — Schema initial
-- Supabase project: nbnbsljqtolzzuqnkyae

-- Enable extensions
create extension if not exists "pgcrypto";

-- Students table
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text not null,
  full_name text,
  color text default 'ember',
  timezone text default 'Europe/Paris',
  joined_at timestamptz default now(),
  contract_starts_at date,
  contract_ends_at date,
  is_active boolean default true,
  notify_at_21h boolean default true,
  is_coach boolean default false
);

-- Daily entries (fiche du jour)
create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade not null,
  entry_date date not null,
  calls int default 0 check (calls >= 0),
  dm int default 0 check (dm >= 0),
  videos int default 0 check (videos >= 0),
  live boolean default false,
  ca_eur numeric(10,2) default 0 check (ca_eur >= 0),
  points int generated always as (
    calls*2 + dm + videos*3 + (case when live then 5 else 0 end)
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(student_id, entry_date)
);
create index if not exists idx_de_date on daily_entries(entry_date);
create index if not exists idx_de_student on daily_entries(student_id, entry_date desc);

-- Audit log (immutable)
create table if not exists entry_audit (
  id bigserial primary key,
  student_id uuid not null,
  entry_date date not null,
  action text not null check (action in ('CREATE','UPDATE','BLOCKED')),
  before_json jsonb,
  after_json jsonb,
  performed_at timestamptz default now(),
  source_ip inet,
  user_agent text
);
create index if not exists idx_ea_student on entry_audit(student_id, performed_at desc);

-- Daily snapshots (gravure 23h59)
create table if not exists daily_snapshots (
  snapshot_date date not null,
  student_id uuid not null,
  payload jsonb not null,
  hash text not null,
  created_at timestamptz default now(),
  primary key (snapshot_date, student_id)
);

-- Audit trigger
create or replace function audit_daily_entries() returns trigger as $$
begin
  insert into entry_audit(student_id, entry_date, action, before_json, after_json)
  values (
    coalesce(new.student_id, old.student_id),
    coalesce(new.entry_date, old.entry_date),
    tg_op,
    case when tg_op='UPDATE' then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_audit_daily on daily_entries;
create trigger trg_audit_daily after insert or update on daily_entries
  for each row execute function audit_daily_entries();

-- updated_at auto
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_touch on daily_entries;
create trigger trg_touch before update on daily_entries
  for each row execute function touch_updated_at();

-- RLS
alter table students enable row level security;
alter table daily_entries enable row level security;
alter table entry_audit enable row level security;
alter table daily_snapshots enable row level security;

-- Student: self-access
drop policy if exists student_self on students;
create policy student_self on students
  for select using (id = auth.uid() or (auth.jwt()->>'is_coach')::bool = true);

drop policy if exists entry_self_read on daily_entries;
create policy entry_self_read on daily_entries
  for select using (student_id = auth.uid() or (auth.jwt()->>'is_coach')::bool = true);

-- LOCKOUT 3 jours
drop policy if exists entry_self_insert on daily_entries;
create policy entry_self_insert on daily_entries
  for insert with check (
    student_id = auth.uid()
    and entry_date >= current_date - interval '3 days'
    and entry_date <= current_date
  );

drop policy if exists entry_self_update on daily_entries;
create policy entry_self_update on daily_entries
  for update using (
    student_id = auth.uid()
    and entry_date >= current_date - interval '3 days'
  );

-- Coach: read all audit & snapshots
drop policy if exists audit_coach_read on entry_audit;
create policy audit_coach_read on entry_audit
  for select using ((auth.jwt()->>'is_coach')::bool = true);

drop policy if exists snapshots_coach_read on daily_snapshots;
create policy snapshots_coach_read on daily_snapshots
  for select using ((auth.jwt()->>'is_coach')::bool = true);
