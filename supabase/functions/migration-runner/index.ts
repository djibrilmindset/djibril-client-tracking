// Edge Function: migration-runner
// Creates tables for the tracking app

import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

Deno.serve(async () => {
  const dbUrl = Deno.env.get("DATABASE_URL")!;
  const client = new Client(dbUrl);
  
  try {
    await client.connect();
    
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS students (
        id uuid primary key default gen_random_uuid(),
        email text unique not null,
        first_name text not null,
        full_name text,
        color text default 'ember',
        joined_at timestamptz default now(),
        is_coach boolean default false,
        is_active boolean default true
      )
    `);
    
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS daily_entries (
        id uuid primary key default gen_random_uuid(),
        student_id uuid references students(id) on delete cascade not null,
        entry_date date not null,
        calls int default 0 check (calls >= 0),
        dm int default 0 check (dm >= 0),
        videos int default 0 check (videos >= 0),
        live boolean default false,
        ca_eur numeric(10,2) default 0 check (ca_eur >= 0),
        points int generated always as (calls*2 + dm + videos*3 + (case when live then 5 else 0 end)) stored,
        created_at timestamptz default now(),
        updated_at timestamptz default now(),
        unique(student_id, entry_date)
      )
    `);
    
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS entry_audit (
        id bigserial primary key,
        student_id uuid not null,
        entry_date date not null,
        action text not null,
        before_json jsonb,
        after_json jsonb,
        performed_at timestamptz default now()
      )
    `);
    
    await client.end();
    return new Response(JSON.stringify({ success: true, message: "Migration complete" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
