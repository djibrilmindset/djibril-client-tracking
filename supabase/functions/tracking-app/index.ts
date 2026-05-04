// Supabase Edge Function: Tracking Djibril
// Serves: Student App + Coach App + DB API

import { createClient } from "jsr:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, supabaseKey);

// ─── Auth ──────────────────────────────────────────────────
const TOKEN_SECRET = Deno.env.get("TOKEN_SECRET") || "djibril-tracking-secret-2026";

function generateToken(studentId: string): string {
  const payload = btoa(JSON.stringify({ sid: studentId, exp: Date.now() + 30 * 86400000 }));
  const sig = btoa(Array.from(new Uint8Array(
    new TextEncoder().encode(payload + TOKEN_SECRET)
  )).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40));
  return payload + "." + sig;
}

function verifyToken(token: string): string | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expected = btoa(Array.from(new Uint8Array(
      new TextEncoder().encode(b64 + TOKEN_SECRET)
    )).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40));
    if (sig !== expected) return null;
    const payload = JSON.parse(atob(b64));
    if (payload.exp < Date.now()) return null;
    return payload.sid;
  } catch { return null; }
}

async function findOrCreateStudent(email: string, firstName: string, lastName: string): Promise<any> {
  email = email.toLowerCase().trim();
  const { data: existing } = await sb.from("students").select("*").eq("email", email).maybeSingle();
  if (existing) return existing;
  const { data: created } = await sb.from("students").insert({ email, first_name: firstName, full_name: lastName }).select().single();
  return created;
}

// ─── Shared Cosmos Background ─────────────────────────────
const COSMOS = `<div class="cosmos" aria-hidden="true">
  <div class="cosmos__noise"></div>
  <div class="cosmos__caps">${[...Array(12)].map((_,i) => `<div class="cosmos__cap cosmos__cap--c${i+1}"></div>`).join('')}</div>
  <div class="cosmos__lines">${[...Array(4)].map((_,i) => `<div class="cosmos__line cosmos__line--${i+1}"></div>`).join('')}</div>
  <div class="cosmos__veil"></div>
</div>`;

// ─── Student App HTML ─────────────────────────────────────
function studentHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tracking · Djibril</title>
<link rel="stylesheet" href="/forge.css">
<style>
  .login-wrapper { min-height:100vh; display:flex; align-items:center; justify-content:center; position:relative; z-index:1 }
  .login-card { background:var(--paper-soft); border:1px solid var(--line-strong); border-radius:var(--r-lg); padding:48px 40px; width:100%; max-width:440px; box-shadow:var(--shadow-2); text-align:center }
  .login-card h1 { font-family:var(--font-display); font-size:clamp(28px,4vw,40px); color:var(--ink); margin-bottom:8px; letter-spacing:-0.5px }
  .login-card h1 em { font-style:italic; background:var(--grad-ember); -webkit-background-clip:text; -webkit-text-fill-color:transparent }
  .login-card p.sub { color:var(--ink-3); font-size:14px; margin-bottom:32px }
  .field { margin-bottom:18px; text-align:left }
  .field label { display:block; font-size:11px; font-weight:600; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px }
  .field input { width:100%; padding:12px 16px; border:1px solid var(--line-strong); border-radius:var(--r-sm); font-size:16px; font-family:var(--font-body); background:var(--paper); color:var(--ink); outline:none; transition:border .2s }
  .field input:focus { border-color:var(--ember); box-shadow:0 0 0 3px var(--ember-soft) }
  .btn-enter { width:100%; padding:14px; background:var(--grad-ember); color:#fff; border:none; border-radius:var(--r-sm); font-size:16px; font-weight:600; cursor:pointer; transition:transform .15s,box-shadow .15s; margin-top:8px }
  .btn-enter:hover { transform:translateY(-1px); box-shadow:var(--shadow-glow) }
  .error-msg { background:var(--blood-soft); color:var(--blood); padding:12px; border-radius:var(--r-sm); font-size:13px; margin-bottom:16px }
  .success-msg { background:rgba(39,166,68,0.1); color:#27a644; padding:12px; border-radius:var(--r-sm); font-size:14px; margin-bottom:16px; text-align:center }
  .sub-info { margin-top:20px; font-size:12px; color:var(--ink-4) }
  .app { position:relative; z-index:1; min-height:100vh; background:transparent }
  .app-header { display:flex; align-items:center; justify-content:space-between; padding:20px 32px; border-bottom:1px solid var(--line); background:rgba(246,241,232,0.92); backdrop-filter:blur(14px); position:sticky; top:0; z-index:50 }
  .app-brand { font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--ink); letter-spacing:-0.3px }
  .user-chip { display:flex; align-items:center; gap:10px; font-size:14px; color:var(--ink-2); cursor:pointer; padding:6px 14px; border-radius:var(--r-pill); background:var(--ember-soft) }
  .app-main { max-width:680px; margin:0 auto; padding:40px 24px }
  .page-id { font-family:var(--font-serif); font-size:clamp(40px,6vw,72px); font-style:italic; color:var(--ink); margin-bottom:8px }
  .page-id em { color:var(--ember) }
  .today-date { font-size:14px; color:var(--ink-3); margin-bottom:32px }
  .card-today { background:var(--paper-soft); border:2px solid var(--ember); border-radius:var(--r-lg); padding:32px; box-shadow:var(--shadow-2) }
  .badge-pulse { display:inline-flex; align-items:center; gap:6px; background:var(--ember-soft); color:var(--ember); padding:4px 12px; border-radius:var(--r-pill); font-size:12px; font-weight:600; margin-bottom:20px }
  .badge-pulse::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--ember); animation:pulse-dot 1.5s ease-in-out infinite }
  @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
  .card-today h2 { font-family:var(--font-display); font-size:22px; color:var(--ink); margin-bottom:24px }
  .field-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px }
  @media(max-width:500px){ .field-row{grid-template-columns:1fr} }
  .field-row .field input { text-align:center; font-size:18px; font-weight:600 }
  .live-toggle { display:flex; align-items:center; gap:10px; margin:12px 0 24px }
  .live-toggle button { padding:8px 20px; border-radius:var(--r-pill); border:2px solid var(--line-strong); background:var(--paper); color:var(--ink-3); cursor:pointer; font-weight:600; font-size:14px; transition:all .2s }
  .live-toggle button.active { background:var(--blood); border-color:var(--blood); color:#fff }
  .btn-save { width:100%; padding:14px; background:var(--grad-ember); color:#fff; border:none; border-radius:var(--r-sm); font-size:16px; font-weight:600; cursor:pointer }
  .btn-save:disabled { opacity:0.5; cursor:not-allowed }
  .recap { margin-top:32px }
  .recap h3 { font-family:var(--font-display); font-size:18px; color:var(--ink); margin-bottom:16px }
  .recap-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--line) }
  .recap-label { font-weight:500; color:var(--ink-2) }
  .recap-value { font-weight:700; color:var(--ink) }
  .recap-points { margin-top:16px; text-align:right; font-family:var(--font-display); font-size:40px; font-weight:700; color:var(--ember) }
</style>
</head>
<body>
${COSMOS}
<div id="app"></div>
<script>
const API = window.location.origin + '/api';
let currentUser = null;

async function login(email, firstName, lastName) {
  const res = await fetch(API + '/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, firstName, lastName}) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur'); }
  const data = await res.json();
  localStorage.setItem('dj_token', data.token);
  localStorage.setItem('dj_user', JSON.stringify(data.student));
  currentUser = data.student;
  render();
}

function logout() { localStorage.removeItem('dj_token'); localStorage.removeItem('dj_user'); currentUser = null; render(); }

async function apiCall(method, path, body) {
  const h = { 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('dj_token') };
  const opts = { method, headers: h };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

function render() {
  const root = document.getElementById('app');
  if (!currentUser) { root.innerHTML = renderLogin(); }
  else { root.innerHTML = renderStudentApp(); }
  bindEvents();
}

function renderLogin() {
  return '<div class="login-wrapper"><div class="login-card">' +
    '<h1>Connecte-toi avec ton <em>email</em></h1>' +
    '<p class="sub">Pas de mot de passe \u2014 entre ton email et ton pr\u00e9nom</p>' +
    '<div id="login-error"></div>' +
    '<div class="field"><label>Email</label><input type="email" id="login-email" placeholder="ton@email.com" autofocus></div>' +
    '<div class="field"><label>Pr\u00e9nom</label><input type="text" id="login-name" placeholder="Jean"></div>' +
    '<div class="field"><label>Nom</label><input type="text" id="login-last" placeholder="Dupont"></div>' +
    '<button class="btn-enter" id="btn-login">Entrer \u2192</button>' +
    '<p class="sub-info">Premi\u00e8re connexion ? Ton compte sera cr\u00e9\u00e9 automatiquement.</p>' +
    '</div></div>';
}

function renderStudentApp() {
  const u = currentUser;
  return '<div class="app">' +
    '<header class="app-header"><div class="app-brand">Tracking</div><div><span class="user-chip" id="btn-logout">' + u.first_name + ' \u21b5</span></div></header>' +
    '<main class="app-main"><div id="msg-area"></div>' +
    '<h1 class="page-id">Ma <em>fiche</em></h1><p class="today-date" id="today-display"></p>' +
    '<div class="card-today">' +
    '<div class="badge-pulse">Aujourd\u2019hui \u2014 \u00e0 remplir</div>' +
    '<h2 id="entry-date-title"></h2>' +
    '<div class="field-row"><div class="field"><label>Calls</label><input type="number" id="field-calls" min="0" value="0"></div><div class="field"><label>DM</label><input type="number" id="field-dm" min="0" value="0"></div></div>' +
    '<div class="field-row"><div class="field"><label>Vid\u00e9os</label><input type="number" id="field-videos" min="0" value="0"></div><div class="field"><label>CA (\u20ac)</label><input type="number" id="field-ca" min="0" step="0.01" value="0"></div></div>' +
    '<div class="live-toggle"><span style="font-weight:600;color:var(--ink-2)">Live</span><button id="btn-live-no" class="active">Non</button><button id="btn-live-yes">Oui</button></div>' +
    '<button class="btn-save" id="btn-save">Enregistrer ma fiche</button></div>' +
    '<div class="recap" id="recap-area"></div></main></div>';
}

function bindEvents() {
  if (!currentUser) {
    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const name = document.getElementById("login-name").value.trim(); const last = document.getElementById("login-last").value.trim();
      if (!email || !name || !last) return;
      try { await login(email, name, last); } catch(e) { document.getElementById('login-error').innerHTML = '<div class="error-msg">' + e.message + '</div>'; }
    });
    document.getElementById('login-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-name.).focus(); }); document.getElementById("login-last").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("btn-login").click(); });
    document.getElementById('login-name").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("login-last").focus(); }); document.getElementById("login-last").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("btn-login").click(); });
  } else {
    document.getElementById('btn-logout').addEventListener('click', logout);
    loadTodayEntry();
    document.getElementById('btn-save').addEventListener('click', saveEntry);
    document.getElementById('btn-live-yes').addEventListener('click', () => toggleLive(true));
    document.getElementById('btn-live-no').addEventListener('click', () => toggleLive(false));
  }
}

async function loadTodayEntry() {
  const data = await apiCall('GET', '/me/today');
  if (!data) return;
  document.getElementById('field-calls').value = data.calls || 0;
  document.getElementById('field-dm').value = data.dm || 0;
  document.getElementById('field-videos').value = data.videos || 0;
  document.getElementById('field-ca').value = data.ca_eur || 0;
  toggleLive(data.live || false);
  document.getElementById('entry-date-title').textContent = data.entry_date || new Date().toISOString().slice(0,10);
  updateRecap(data);
  const today = new Date();
  document.getElementById('today-display').textContent = today.toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'});
}

function toggleLive(val) {
  window._live = val;
  document.getElementById('btn-live-yes').className = val ? 'active' : '';
  document.getElementById('btn-live-no').className = val ? '' : 'active';
}

function updateRecap(data) {
  const calls = data.calls || 0, dm = data.dm || 0, videos = data.videos || 0, live = data.live || false;
  const points = calls*2 + dm + videos*3 + (live ? 5 : 0), ca = data.ca_eur || 0;
  document.getElementById('recap-area').innerHTML = '<h3>R\u00e9capitulatif</h3>' +
    '<div class="recap-row"><span class="recap-label">Calls</span><span class="recap-value">' + calls + ' \u00d7 2 = ' + (calls*2) + ' pts</span></div>' +
    '<div class="recap-row"><span class="recap-label">DM</span><span class="recap-value">' + dm + ' \u00d7 1 = ' + dm + ' pts</span></div>' +
    '<div class="recap-row"><span class="recap-label">Vid\u00e9os</span><span class="recap-value">' + videos + ' \u00d7 3 = ' + (videos*3) + ' pts</span></div>' +
    '<div class="recap-row"><span class="recap-label">Live</span><span class="recap-value">' + (live ? 'Oui (+5 pts)' : 'Non') + '</span></div>' +
    (ca > 0 ? '<div class="recap-row"><span class="recap-label">CA g\u00e9n\u00e9r\u00e9</span><span class="recap-value">' + ca.toFixed(2) + ' \u20ac</span></div>' : '') +
    '<div class="recap-points">' + points + ' pts</div>';
}

async function saveEntry() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  const data = { calls: parseInt(document.getElementById('field-calls').value)||0, dm: parseInt(document.getElementById('field-dm').value)||0, videos: parseInt(document.getElementById('field-videos').value)||0, live: window._live||false, ca_eur: parseFloat(document.getElementById('field-ca').value)||0 };
  const res = await apiCall('PUT', '/me/entries/' + new Date().toISOString().slice(0,10), data);
  btn.disabled = false; btn.textContent = 'Enregistrer ma fiche';
  if (res && res.id) {
    document.getElementById('msg-area').innerHTML = '<div class="success-msg">\u2713 Fiche enregistr\u00e9e !</div>';
    updateRecap(res);
    setTimeout(() => { document.getElementById('msg-area').innerHTML = ''; }, 3000);
  } else {
    document.getElementById('msg-area').innerHTML = '<div class="error-msg">' + (res?.error || 'Erreur') + '</div>';
  }
}

const savedUser = localStorage.getItem('dj_user');
const savedToken = localStorage.getItem('dj_token');
if (savedUser && savedToken) { currentUser = JSON.parse(savedUser); }
render();
</script>
</body>
</html>`;
}

// ─── Coach App HTML ────────────────────────────────────────
function coachHtml(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Coach \u00b7 Djibril Tracking</title>
<link rel="stylesheet" href="/forge.css">
<style>
  .app-c { max-width:1100px; margin:0 auto; padding:0 24px; position:relative; z-index:1 }
  .admin-header { display:flex; align-items:center; gap:14px; padding:18px 0; border-bottom:1px solid var(--line); margin-bottom:24px; position:sticky; top:0; background:rgba(246,241,232,0.92); backdrop-filter:blur(14px); z-index:50 }
  .app-brand { font-family:var(--font-display); font-size:20px; font-weight:700; color:var(--ink) }
  .badge-coach { display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:var(--r-pill); background:var(--plum-soft); color:var(--plum); font-size:12px; font-weight:600 }
  .page-id { font-family:var(--font-serif); font-size:clamp(36px,5vw,56px); font-style:italic; color:var(--ink); margin-bottom:24px }
  .page-id em { color:var(--ember) }
  .kpi-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:28px }
  @media(max-width:700px){ .kpi-bar{grid-template-columns:repeat(2,1fr)} }
  .kpi-card { background:var(--paper-soft); border:1px solid var(--line); border-radius:var(--r-md); padding:16px; text-align:center }
  .kpi-num { font-family:var(--font-display); font-size:24px; font-weight:700; color:var(--ink) }
  .kpi-label { font-size:11px; color:var(--ink-4); text-transform:uppercase; letter-spacing:0.5px; margin-top:2px }
  .section-title { font-family:var(--font-display); font-size:20px; color:var(--ink); margin:32px 0 16px }
  table { width:100%; border-collapse:collapse }
  th { text-align:left; padding:10px 14px; font-size:11px; font-weight:600; color:var(--ink-4); text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--line-strong); background:var(--paper-soft) }
  td { padding:12px 14px; border-bottom:1px solid var(--line); font-size:14px }
  tr:hover td { background:var(--ember-soft) }
  a { color:var(--ember); text-decoration:none; font-weight:600 }
  .status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px }
  .status-filled { background:var(--ember) }
  .status-missing { background:var(--ink-4) }
  .btn-back { display:inline-block; padding:8px 18px; border:1px solid var(--line-strong); border-radius:var(--r-pill); font-size:13px; font-weight:600; cursor:pointer; background:var(--paper-soft); color:var(--ink-3); text-decoration:none }
  .btn-back:hover { background:var(--paper-deep) }
  .audit-log { background:#1a1614; color:#d4ccc4; border-radius:var(--r-md); padding:20px; font-family:var(--font-mono); font-size:12px; max-height:400px; overflow-y:auto; margin-top:16px; line-height:1.6 }
  .audit-line { padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05) }
  .empty-state { text-align:center; padding:48px; color:var(--ink-4) }
</style>
</head>
<body>
${COSMOS}
<div id="app"></div>
<script>
const API = window.location.origin + '/api/coach';
let students = [];

async function load() {
  document.getElementById('app').innerHTML = '<div class="app-c" style="text-align:center;padding:80px">Chargement...</div>';
  const res = await fetch(API + '/students'); students = await res.json();
  const stats = await fetch(API + '/stats').then(r => r.json());
  renderList(stats);
}

function renderList(stats) {
  let rows = '';
  students.forEach(s => {
    const filled = s.has_filled;
    rows += '<tr><td>' + s.first_name + ' ' + (s.full_name||'') + '</td><td>' + s.email + '</td><td><span class="status-dot ' + (filled?'status-filled':'status-missing') + '"></span>' + (filled?'Rempli':'Manquant') + '</td><td><a href="#" onclick="showDetail(\'' + s.id + '\')">Voir \u2192</a></td></tr>';
  });
  document.getElementById('app').innerHTML = '<div class="app-c"><header class="admin-header"><div class="app-brand">Tracking Coach</div><span class="badge-coach">\ud83d\udd10 Coach</span></header><h1 class="page-id">Mes <em>\u00e9l\u00e8ves</em></h1><div class="kpi-bar"><div class="kpi-card"><div class="kpi-num">' + (stats.total||0) + '</div><div class="kpi-label">Total</div></div><div class="kpi-card"><div class="kpi-num">' + (stats.filled||0) + '</div><div class="kpi-label">Remplis</div></div><div class="kpi-card"><div class="kpi-num">' + (stats.missing||0) + '</div><div class="kpi-label">Manquants</div></div><div class="kpi-card"><div class="kpi-num">\u2014</div><div class="kpi-label">CA cumul\u00e9</div></div></div><h2 class="section-title">Liste</h2><table><thead><tr><th>Nom</th><th>Email</th><th>Aujourd\u2019hui</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

async function showDetail(id) {
  document.getElementById('app').innerHTML = '<div class="app-c" style="text-align:center;padding:80px">Chargement...</div>';
  const res = await fetch(API + '/students/' + id); const data = await res.json();
  const s = data.student, entries = data.entries || [];
  let entryRows = '';
  entries.slice(0,14).forEach(e => { entryRows += '<tr><td>' + e.entry_date + '</td><td>' + e.calls + '</td><td>' + e.dm + '</td><td>' + e.videos + '</td><td>' + (e.live?'Oui':'\u2014') + '</td><td>' + e.ca_eur + '\u20ac</td><td>' + (e.calls*2+e.dm+e.videos*3+(e.live?5:0)) + ' pts</td></tr>'; });
  let auditHtml = '';
  (data.audit||[]).forEach(a => { auditHtml += '<div class="audit-line' + (a.action==='UPDATE'?' style="color:#f59e0b"':'') + '">' + (a.performed_at||'').slice(0,19) + ' [' + a.action + '] ' + a.entry_date + '</div>'; });
  document.getElementById('app').innerHTML = '<div class="app-c"><header class="admin-header"><div class="app-brand">Tracking Coach</div><a href="#" class="btn-back" onclick="load();return false">\u2190 Retour</a></header><h1 class="page-id" style="font-size:clamp(28px,4vw,40px)">' + s.first_name + ' <em>' + (s.full_name||'') + '</em></h1><p style="color:var(--ink-3);margin-bottom:24px">' + s.email + ' \u00b7 Inscrit le ' + (s.joined_at||'').slice(0,10) + '</p><h2 class="section-title">Fiches r\u00e9centes</h2>' + (entryRows?'<table><thead><tr><th>Date</th><th>Calls</th><th>DM</th><th>Vid\u00e9os</th><th>Live</th><th>CA</th><th>Points</th></tr></thead><tbody>' + entryRows + '</tbody></table>':'<div class="empty-state">Aucune fiche</div>') + '<h2 class="section-title" style="margin-top:32px">Audit log</h2><div class="audit-log">' + (auditHtml||'Aucune modification') + '</div></div>';
}

load();
</script>
</body>
</html>`;
}

// ─── API Routes ────────────────────────────────────────────
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let path = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") return new Response(null, { headers: CORS });

  // Normalize path
  if (path.startsWith("/tracking-app")) path = path.slice("/tracking-app".length) || "/";

  // Static
  if (path === "/forge.css") {
    try {
      const css = await Deno.readTextFile("./forge.css");
      return new Response(css, { headers: { ...CORS, "Content-Type": "text/css" } });
    } catch { return new Response("/* css not found */", { headers: { ...CORS, "Content-Type": "text/css" } }); }
  }

  // Coach API (open)
  if (path === "/api/coach/students" && method === "GET") {
    const { data: students } = await sb.from("students").select("*").order("joined_at", { ascending: false });
    const today = new Date().toISOString().slice(0, 10);
    const { data: entries } = await sb.from("daily_entries").select("*").eq("entry_date", today);
    const entryMap: Record<string, any> = {};
    (entries || []).forEach((e: any) => { entryMap[e.student_id] = e; });
    const result = (students || []).map((s: any) => ({ ...s, today_entry: entryMap[s.id] || null, has_filled: !!entryMap[s.id] }));
    return Response.json(result, { headers: CORS });
  }

  if (path === "/api/coach/stats" && method === "GET") {
    const { count: total } = await sb.from("students").select("*", { count: "exact", head: true });
    const today = new Date().toISOString().slice(0, 10);
    const { count: filled } = await sb.from("daily_entries").select("*", { count: "exact", head: true }).eq("entry_date", today);
    return Response.json({ total: total || 0, filled: filled || 0, missing: (total || 0) - (filled || 0) }, { headers: CORS });
  }

  const detailMatch = path.match(/^\/api\/coach\/students\/([a-f0-9-]+)$/);
  if (detailMatch && method === "GET") {
    const sid = detailMatch[1];
    const { data: student } = await sb.from("students").select("*").eq("id", sid).single();
    const { data: entries } = await sb.from("daily_entries").select("*").eq("student_id", sid).order("entry_date", { ascending: false }).limit(30);
    const { data: audit } = await sb.from("entry_audit").select("*").eq("student_id", sid).order("performed_at", { ascending: false }).limit(50);
    return Response.json({ student, entries: entries || [], audit: audit || [] }, { headers: CORS });
  }

  // Auth
  if (path === "/api/auth" && method === "POST") {
    const { email, firstName, lastName } = await req.json();
    if (!email || !firstName || !lastName) return Response.json({ error: "Email, pr\u00e9nom et nom requis" }, { status: 400, headers: CORS });
    const student = await findOrCreateStudent(email, firstName, lastName);
    const token = generateToken(student.id);
    return Response.json({ token, student }, { headers: CORS });
  }

  // Auth middleware
  const authHeader = req.headers.get("Authorization");
  let studentId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    studentId = verifyToken(authHeader.slice(7));
  }

  if (path.startsWith("/api/") && !path.startsWith("/api/coach/")) {
    if (!studentId) return Response.json({ error: "Non autoris\u00e9" }, { status: 401, headers: CORS });

    if (path === "/api/me/today" && method === "GET") {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await sb.from("daily_entries").select("*").eq("student_id", studentId).eq("entry_date", today).maybeSingle();
      if (data) return Response.json(data, { headers: CORS });
      const { data: created } = await sb.from("daily_entries").insert({ student_id: studentId, entry_date: today, calls: 0, dm: 0, videos: 0, live: false, ca_eur: 0 }).select().single();
      return Response.json(created, { headers: CORS });
    }

    const entryMatch = path.match(/^\/api\/me\/entries\/(\d{4}-\d{2}-\d{2})$/);
    if (entryMatch && method === "PUT") {
      const entryDate = entryMatch[1];
      const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      if (new Date(entryDate) < new Date(threeDaysAgo.toISOString().slice(0,10))) {
        return Response.json({ error: "Tu ne peux modifier que les 3 derniers jours" }, { status: 400, headers: CORS });
      }
      const body = await req.json();
      const { data } = await sb.from("daily_entries").upsert({
        student_id: studentId, entry_date: entryDate,
        calls: body.calls || 0, dm: body.dm || 0, videos: body.videos || 0,
        live: body.live || false, ca_eur: body.ca_eur || 0
      }, { onConflict: "student_id, entry_date" }).select().single();
      return Response.json(data, { headers: CORS });
    }
  }

  // Pages
  if (path === "/" || path === "/student" || path === "/app") {
    return new Response(studentHtml(), { headers: { ...CORS, "Content-Type": "text/html" } });
  }

  if (path === "/coach" || path === "/admin") {
    return new Response(coachHtml(), { headers: { ...CORS, "Content-Type": "text/html" } });
  }

  return new Response("Not Found", { status: 404, headers: CORS });
}

serve(handleRequest);
