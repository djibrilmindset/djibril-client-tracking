// Supabase Edge Function: Tracking Djibril v6
import { createClient } from "jsr:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
const S=`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tracking · Djibril</title>
<link rel="stylesheet" href="forge.css">
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
  .user-chip { display:flex; align-items:center; gap:10px; font-size:14px; color:var(--ink-2); cursor:pointer; padding:6px 14px; border-radius:var(--r-pill); background:var(--ember-soft); border:none }
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
  .history-section { margin-top:48px }
  .history-section h3 { font-family:var(--font-display); font-size:18px; color:var(--ink); margin-bottom:16px }
  .history-table { width:100%; border-collapse:collapse; font-size:13px }
  .history-table th { text-align:left; padding:8px 12px; font-size:11px; font-weight:600; color:var(--ink-4); text-transform:uppercase; border-bottom:1px solid var(--line-strong); background:var(--paper-soft) }
  .history-table td { padding:8px 12px; border-bottom:1px solid var(--line) }
</style>
</head>
<body>
<div class="cosmos" aria-hidden="true"></div>
<div id="app"></div>

<script>
const API = './api';
let currentUser = null;

async function login(email, firstName, lastName) {
  const res = await fetch(API + '/auth', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, firstName, lastName})
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Erreur'); }
  const data = await res.json();
  localStorage.setItem('dj_token', data.token);
  localStorage.setItem('dj_user', JSON.stringify(data.student));
  currentUser = data.student;
  render();
}

function logout() {
  localStorage.removeItem('dj_token');
  localStorage.removeItem('dj_user');
  currentUser = null;
  render();
}

async function apiCall(method, path, body) {
  const h = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('dj_token')
  };
  const opts = { method, headers: h };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

function render() {
  const root = document.getElementById('app');
  if (!currentUser) { root.innerHTML = renderLogin(); bindLoginEvents(); }
  else { root.innerHTML = renderStudentApp(); bindAppEvents(); loadTodayEntry(); }
}

function renderLogin() {
  return \`<div class="login-wrapper"><div class="login-card">
    <h1>Connecte-toi avec ton <em>email</em></h1>
    <p class="sub">Pas de mot de passe — entre ton email et ton prénom</p>
    <div id="login-error"></div>
    <div class="field"><label>Email</label><input type="email" id="login-email" placeholder="ton@email.com" autofocus></div>
    <div class="field"><label>Prénom</label><input type="text" id="login-name" placeholder="Jean"></div>
    <div class="field"><label>Nom</label><input type="text" id="login-last" placeholder="Dupont"></div>
    <button class="btn-enter" id="btn-login">Entrer →</button>
    <p class="sub-info">Première connexion ? Ton compte sera créé automatiquement.</p>
  </div></div>\`;
}

function renderStudentApp() {
  const u = currentUser;
  return \`<div class="app">
    <header class="app-header">
      <div class="app-brand">Tracking</div>
      <button class="user-chip" id="btn-logout">\${}u.first_name} ↵</button>
    </header>
    <main class="app-main">
      <div id="msg-area"></div>
      <h1 class="page-id">Ma <em>fiche</em></h1>
      <p class="today-date" id="today-display"></p>
      <div class="card-today">
        <div class="badge-pulse">Aujourd'hui — à remplir</div>
        <h2 id="entry-date-title"></h2>
        <div class="field-row">
          <div class="field"><label>Calls</label><input type="number" id="field-calls" min="0" value="0"></div>
          <div class="field"><label>DM</label><input type="number" id="field-dm" min="0" value="0"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Vidéos</label><input type="number" id="field-videos" min="0" value="0"></div>
          <div class="field"><label>CA (€)</label><input type="number" id="field-ca" min="0" step="0.01" value="0"></div>
        </div>
        <div class="live-toggle">
          <span style="font-weight:600;color:var(--ink-2)">Live</span>
          <button id="btn-live-no" class="active">Non</button>
          <button id="btn-live-yes">Oui</button>
        </div>
        <button class="btn-save" id="btn-save">Enregistrer ma fiche</button>
      </div>
      <div class="recap" id="recap-area"></div>
      <div class="history-section">
        <h3>Historique récent</h3>
        <div id="history-table"></div>
      </div>
    </main>
  </div>\`;
}

function bindLoginEvents() {
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const name = document.getElementById('login-name').value.trim();
    const last = document.getElementById('login-last').value.trim();
    if (!email || !name || !last) return;
    try {
      await login(email, name, last);
    } catch(e) {
      document.getElementById('login-error').innerHTML = '<div class="error-msg">' + e.message + '</div>';
    }
  });
  document.getElementById('login-last').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });
}

function bindAppEvents() {
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-save').addEventListener('click', saveEntry);
  document.getElementById('btn-live-yes').addEventListener('click', () => toggleLive(true));
  document.getElementById('btn-live-no').addEventListener('click', () => toggleLive(false));
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

  // Load history
  const history = await apiCall('GET', '/me/history');
  if (history && history.length > 0) {
    let rows = '';
    history.slice(0, 14).forEach(e => {
      const pts = (e.calls||0)*2 + (e.dm||0) + (e.videos||0)*3 + (e.live ? 5 : 0);
      rows += \`<tr>
        <td>\${}e.entry_date}</td>
        <td>\${}e.calls||0}</td><td>\${}e.dm||0}</td><td>\${}e.videos||0}</td>
        <td>\${}e.live ? 'Oui' : '—'}</td>
        <td>\${}(e.ca_eur||0).toFixed(2)}€</td>
        <td><strong>\${}pts}</strong></td>
      </tr>\`;
    });
    document.getElementById('history-table').innerHTML = \`<table class="history-table">
      <thead><tr><th>Date</th><th>Calls</th><th>DM</th><th>Vidéos</th><th>Live</th><th>CA</th><th>Pts</th></tr></thead>
      <tbody>\${}rows}</tbody></table>\`;
  }
}

function toggleLive(val) {
  window._live = val;
  document.getElementById('btn-live-yes').className = val ? 'active' : '';
  document.getElementById('btn-live-no').className = val ? '' : 'active';
}

function updateRecap(data) {
  const calls = data.calls || 0, dm = data.dm || 0, videos = data.videos || 0, live = data.live || false;
  const points = calls*2 + dm + videos*3 + (live ? 5 : 0), ca = data.ca_eur || 0;
  document.getElementById('recap-area').innerHTML = \`<h3>Récapitulatif</h3>
    <div class="recap-row"><span class="recap-label">Calls</span><span class="recap-value">\${}calls} × 2 = \${}calls*2} pts</span></div>
    <div class="recap-row"><span class="recap-label">DM</span><span class="recap-value">\${}dm} × 1 = \${}dm} pts</span></div>
    <div class="recap-row"><span class="recap-label">Vidéos</span><span class="recap-value">\${}videos} × 3 = \${}videos*3} pts</span></div>
    <div class="recap-row"><span class="recap-label">Live</span><span class="recap-value">\${}live ? 'Oui (+5 pts)' : 'Non'}</span></div>
    \${}ca > 0 ? \`<div class="recap-row"><span class="recap-label">CA généré</span><span class="recap-value">\${}ca.toFixed(2)} €</span></div>\` : ''}
    <div class="recap-points">\${}points} pts</div>\`;
}

async function saveEntry() {
  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  const data = {
    calls: parseInt(document.getElementById('field-calls').value)||0,
    dm: parseInt(document.getElementById('field-dm').value)||0,
    videos: parseInt(document.getElementById('field-videos').value)||0,
    live: window._live||false,
    ca_eur: parseFloat(document.getElementById('field-ca').value)||0
  };
  const res = await apiCall('PUT', '/me/entries/' + new Date().toISOString().slice(0,10), data);
  btn.disabled = false; btn.textContent = 'Enregistrer ma fiche';
  if (res && res.id) {
    document.getElementById('msg-area').innerHTML = '<div class="success-msg">✓ Fiche enregistrée !</div>';
    updateRecap(res);
    setTimeout(() => { document.getElementById('msg-area').innerHTML = ''; }, 3000);
  } else {
    document.getElementById('msg-area').innerHTML = '<div class="error-msg">' + (res?.detail || 'Erreur') + '</div>';
  }
}

// Init
const savedUser = localStorage.getItem('dj_user');
const savedToken = localStorage.getItem('dj_token');
if (savedUser && savedToken) { currentUser = JSON.parse(savedUser); }
render();
</script>
</body>
</html>
`,C=`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Coach · Djibril Tracking</title>
<link rel="stylesheet" href="forge.css">
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
  a { color:var(--ember); text-decoration:none; font-weight:600; cursor:pointer }
  .status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px }
  .status-filled { background:var(--ember) }
  .status-missing { background:var(--ink-4) }
  .btn-back { display:inline-block; padding:8px 18px; border:1px solid var(--line-strong); border-radius:var(--r-pill); font-size:13px; font-weight:600; cursor:pointer; background:var(--paper-soft); color:var(--ink-3); text-decoration:none }
  .btn-back:hover { background:var(--paper-deep) }
  .audit-log { background:#1a1614; color:#d4ccc4; border-radius:var(--r-md); padding:20px; font-family:var(--font-mono); font-size:12px; max-height:400px; overflow-y:auto; margin-top:16px; line-height:1.6 }
  .audit-line { padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05) }
  .empty-state { text-align:center; padding:48px; color:var(--ink-4) }
  .refresh-btn { display:inline-block; padding:6px 16px; border:1px solid var(--line-strong); border-radius:var(--r-pill); font-size:12px; cursor:pointer; background:var(--paper-soft); color:var(--ink-3); margin-left:12px }
  .refresh-btn:hover { background:var(--paper-deep) }
</style>
</head>
<body>
<div class="cosmos" aria-hidden="true"></div>
<div id="app"><div class="app-c" style="text-align:center;padding:80px">Chargement...</div></div>

<script>
const API = './api/coach';
let students = [];

async function load() {
  document.getElementById('app').innerHTML = '<div class="app-c" style="text-align:center;padding:80px">Chargement...</div>';
  const res = await fetch(API + '/students');
  students = await res.json();
  const stats = await fetch(API + '/stats').then(r => r.json());
  renderList(stats);
}

function renderList(stats) {
  let rows = '';
  students.forEach(s => {
    const filled = s.has_filled;
    rows += \`<tr>
      <td>\${}s.first_name} \${}s.full_name||''}</td>
      <td>\${}s.email}</td>
      <td><span class="status-dot \${}filled?'status-filled':'status-missing'}"></span>\${}filled?'Rempli':'Manquant'}</td>
      <td><a onclick="showDetail('\${}s.id}')">Voir →</a></td>
    </tr>\`;
  });
  document.getElementById('app').innerHTML = \`<div class="app-c">
    <header class="admin-header">
      <div class="app-brand">Tracking Coach</div>
      <span class="badge-coach">🔐 Coach</span>
      <span style="flex:1"></span>
      <button class="refresh-btn" onclick="load()">Rafraîchir</button>
    </header>
    <h1 class="page-id">Mes <em>élèves</em></h1>
    <div class="kpi-bar">
      <div class="kpi-card"><div class="kpi-num">\${}stats.total||0}</div><div class="kpi-label">Total</div></div>
      <div class="kpi-card"><div class="kpi-num">\${}stats.filled||0}</div><div class="kpi-label">Remplis</div></div>
      <div class="kpi-card"><div class="kpi-num">\${}stats.missing||0}</div><div class="kpi-label">Manquants</div></div>
      <div class="kpi-card"><div class="kpi-num">\${}(stats.ca_total||0).toFixed(0)}€</div><div class="kpi-label">CA jour</div></div>
    </div>
    <h2 class="section-title">Liste</h2>
    \${}students.length > 0 ? \`<table><thead><tr><th>Nom</th><th>Email</th><th>Aujourd'hui</th><th></th></tr></thead><tbody>\${}rows}</tbody></table>\` : '<div class="empty-state">Aucun élève</div>'}
  </div>\`;
}

async function showDetail(id) {
  document.getElementById('app').innerHTML = '<div class="app-c" style="text-align:center;padding:80px">Chargement...</div>';
  const res = await fetch(API + '/students/' + id);
  const data = await res.json();
  const s = data.student, entries = data.entries || [];

  let entryRows = '';
  entries.slice(0, 14).forEach(e => {
    entryRows += \`<tr>
      <td>\${}e.entry_date}</td>
      <td>\${}e.calls}</td><td>\${}e.dm}</td><td>\${}e.videos}</td>
      <td>\${}e.live?'Oui':'—'}</td>
      <td>\${}(e.ca_eur||0).toFixed(2)}€</td>
      <td><strong>\${}e.calls*2 + e.dm + e.videos*3 + (e.live?5:0)}</strong></td>
    </tr>\`;
  });

  let auditHtml = '';
  (data.audit||[]).forEach(a => {
    const ts = (a.performed_at||'').slice(0,19);
    const color = a.action === 'UPDATE' ? 'style="color:#f59e0b"' : '';
    auditHtml += \`<div class="audit-line" \${}color}>\${}ts} [\${}a.action}] \${}a.entry_date}</div>\`;
  });

  // Compute stats
  const totalPts = entries.reduce((sum, e) => sum + e.calls*2 + e.dm + e.videos*3 + (e.live?5:0), 0);
  const totalCA = entries.reduce((sum, e) => sum + (e.ca_eur||0), 0);

  document.getElementById('app').innerHTML = \`<div class="app-c">
    <header class="admin-header">
      <div class="app-brand">Tracking Coach</div>
      <a class="btn-back" onclick="load()">← Retour</a>
    </header>
    <h1 class="page-id" style="font-size:clamp(28px,4vw,40px)">\${}s.first_name} <em>\${}s.full_name||''}</em></h1>
    <p style="color:var(--ink-3);margin-bottom:24px">\${}s.email} · Inscrit le \${}(s.joined_at||'').slice(0,10)}</p>
    <div class="kpi-bar" style="grid-template-columns:repeat(3,1fr);margin-bottom:32px">
      <div class="kpi-card"><div class="kpi-num">\${}entries.length}</div><div class="kpi-label">Fiches</div></div>
      <div class="kpi-card"><div class="kpi-num">\${}totalPts}</div><div class="kpi-label">Points totaux</div></div>
      <div class="kpi-card"><div class="kpi-num">\${}totalCA.toFixed(0)}€</div><div class="kpi-label">CA cumulé</div></div>
    </div>
    <h2 class="section-title">Fiches récentes</h2>
    \${}entryRows ? \`<table><thead><tr><th>Date</th><th>Calls</th><th>DM</th><th>Vidéos</th><th>Live</th><th>CA</th><th>Points</th></tr></thead><tbody>\${}entryRows}</tbody></table>\` : '<div class="empty-state">Aucune fiche</div>'}
    <h2 class="section-title" style="margin-top:32px">Audit log</h2>
    <div class="audit-log">\${}auditHtml || 'Aucune modification'}</div>
  </div>\`;
}

load();
</script>
</body>
</html>
`,F=`

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&family=Anton&display=swap');

:root {
  --font-body:    'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-display: 'Space Grotesk', 'Inter', sans-serif;
  --font-serif:   'Playfair Display', Georgia, serif;
  --font-impact:  'Anton', 'Space Grotesk', sans-serif;
  --font-mono:    ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  
  --paper:       #f6f1e8;        
  --paper-deep:  #ede5d7;        
  --paper-soft:  #faf6ee;        
  --ink:         #1a0f08;        
  --ink-2:       #3a2618;        
  --ink-3:       #6e5a4a;        
  --ink-4:       #9b8975;        
  --line:        rgba(26,15,8,0.08);
  --line-strong: rgba(26,15,8,0.16);

  
  --ember:    #e85d2c;   
  --ember-2:  #c64514;
  --blood:    #b91c1c;   
  --gold:     #d4951a;   
  --gold-2:   #a87212;
  --bone:     #f4e4c1;
  --plum:     #6b3a4f;   
  --ink-blue: #2c3e50;   

  --ember-soft:  rgba(232,93,44,0.10);
  --blood-soft:  rgba(185,28,28,0.10);
  --gold-soft:   rgba(212,149,26,0.12);
  --plum-soft:   rgba(107,58,79,0.10);

  
  --grad-capsule: linear-gradient(135deg,#ff6bb0 0%, #ffd684 45%, #78d5e8 100%);
  --grad-ember:   linear-gradient(135deg,#fbbf24 0%, #f59e0b 40%, #e85d2c 100%);
  --grad-blood:   linear-gradient(135deg,#e85d2c 0%, #b91c1c 100%);

  
  --shadow-1: 0 1px 2px rgba(26,15,8,0.04), 0 2px 6px rgba(26,15,8,0.04);
  --shadow-2: 0 4px 16px rgba(26,15,8,0.06), 0 1px 3px rgba(26,15,8,0.04);
  --shadow-3: 0 12px 40px rgba(26,15,8,0.10), 0 4px 12px rgba(26,15,8,0.06);
  --shadow-glow: 0 0 0 1px rgba(232,93,44,0.18), 0 8px 32px rgba(232,93,44,0.20);

  
  --type-display: clamp(48px, 6vw, 80px);
  --type-h1:      clamp(32px, 4vw, 48px);
  --type-h2:      clamp(22px, 2.4vw, 28px);
  --type-h3:      18px;
  --type-body:    15px;
  --type-small:   13px;
  --type-caption: 11px;

  
  --r-xs: 6px;
  --r-sm: 10px;
  --r-md: 14px;
  --r-lg: 20px;
  --r-xl: 28px;
  --r-pill: 999px;

  
  --dock-w: 220px;
  --dock-w-expanded: 240px;
}

*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  font-size: var(--type-body);
  color: var(--ink-2);
  background: var(--paper);
  font-feature-settings: 'cv02','cv03','cv04','cv11','ss01';
  overflow-x: hidden;
  position: relative;
  min-height: 100vh;
}


.cosmos {
  position: fixed;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(232,93,44,0.10), transparent 60%),
    radial-gradient(ellipse 60% 50% at 10% 30%, rgba(212,149,26,0.08), transparent 60%),
    radial-gradient(ellipse 80% 60% at 50% 100%, rgba(107,58,79,0.06), transparent 60%),
    radial-gradient(ellipse 40% 30% at 30% 70%, rgba(120,213,232,0.05), transparent 60%),
    var(--paper);
}

.cosmos__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  mix-blend-mode: multiply;
  animation: orb-float 22s ease-in-out infinite;
}
.cosmos__orb--1 { width: 520px; height: 520px; top: -120px; right: -100px; background: radial-gradient(circle, #ff6bb0 0%, transparent 65%); animation-duration: 24s; }
.cosmos__orb--2 { width: 440px; height: 440px; bottom: -120px; left: 10%;   background: radial-gradient(circle, #ffd684 0%, transparent 65%); animation-duration: 28s; animation-delay: -6s; }
.cosmos__orb--3 { width: 380px; height: 380px; top: 40%; left: -120px;       background: radial-gradient(circle, #78d5e8 0%, transparent 65%); animation-duration: 26s; animation-delay: -12s; }
.cosmos__orb--4 { width: 360px; height: 360px; top: 60%; right: 20%;          background: radial-gradient(circle, #e85d2c 0%, transparent 65%); animation-duration: 30s; animation-delay: -3s; }

@keyframes orb-float {
  0%, 100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(40px,-30px) scale(1.08); }
  66%      { transform: translate(-30px,40px) scale(0.95); }
}


.grain {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  mix-blend-mode: multiply;
  opacity: 0.06;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.07  0 0 0 0 0.04  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

@media (prefers-reduced-motion: reduce) {
  .cosmos__orb { animation: none; }
}


h1,h2,h3,h4,h5 {
  font-family: var(--font-display);
  color: var(--ink);
  letter-spacing: -0.02em;
  font-weight: 700;
}
em, .serif {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 700;
}

.eyebrow {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.tabular { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

::selection { background: var(--ember); color: var(--paper-soft); }


*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: rgba(26,15,8,0.15); border-radius: 999px; }
*::-webkit-scrollbar-thumb:hover { background: rgba(26,15,8,0.30); }



.cap {
  position: relative;
  display: inline-block;
  width: var(--cap-size, 64px);
  height: calc(var(--cap-size, 64px) * 2);
  border-radius: 999px;
  flex-shrink: 0;
  isolation: isolate;
  background:
    
    radial-gradient(ellipse 18% 9% at 30% 10%, rgba(255,255,255,1), rgba(255,255,255,0) 65%),
    
    radial-gradient(ellipse 65% 26% at 50% 16%, rgba(255,107,176,0.95), rgba(255,107,176,0) 70%),
    
    radial-gradient(ellipse 36% 22% at 72% 30%, rgba(255,180,230,0.65), rgba(255,180,230,0) 70%),
    
    radial-gradient(ellipse 90% 50% at 50% 54%, rgba(255,214,132,0.95) 0%, rgba(232,160,80,0.95) 40%, rgba(140,80,30,0.55) 100%),
    
    radial-gradient(ellipse 80% 28% at 50% 88%, rgba(120,213,232,0.7), rgba(120,213,232,0) 70%),
    
    radial-gradient(ellipse 55% 20% at 50% 96%, rgba(60,30,10,0.55), rgba(0,0,0,0) 80%),
    #2a1a10;
  box-shadow:
    
    0 0 calc(var(--cap-size, 64px) * 0.5) rgba(255,107,176,0.5),
    0 0 calc(var(--cap-size, 64px) * 1.4) calc(var(--cap-size, 64px) * -0.15) rgba(255,180,80,0.45),
    calc(var(--cap-size, 64px) * 0.04) calc(var(--cap-size, 64px) * 0.2) calc(var(--cap-size, 64px) * 1.2) calc(var(--cap-size, 64px) * -0.3) rgba(120,213,232,0.4),
    
    inset 0 0 0 1px rgba(255,255,255,0.55),
    inset 0 0 0 2px rgba(255,130,200,0.3),
    
    inset 0 calc(var(--cap-size, 64px) * 0.06) calc(var(--cap-size, 64px) * 0.14) rgba(255,255,255,0.35),
    inset 0 calc(var(--cap-size, 64px) * -0.08) calc(var(--cap-size, 64px) * 0.22) rgba(0,0,0,0.6);
  animation: cap-float 9s ease-in-out infinite;
}

.cap::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: conic-gradient(from 130deg at 50% 50%,
    rgba(255,107,176,0.5) 0deg,
    rgba(255,200,140,0.3) 80deg,
    rgba(255,214,132,0.5) 140deg,
    rgba(255,154,58,0.3) 210deg,
    rgba(180,80,140,0.3) 270deg,
    rgba(120,90,220,0.35) 310deg,
    rgba(74,181,232,0.45) 350deg,
    rgba(255,107,176,0.5) 360deg);
  mix-blend-mode: overlay;
  opacity: 0.95;
  animation: cap-rim 11s linear infinite;
  pointer-events: none;
}

.cap::after {
  content: "";
  position: absolute;
  top: 5%; left: 22%;
  width: 22%; height: 38%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.4) 50%, rgba(255,255,255,0));
  filter: blur(1.5px);
  pointer-events: none;
  transform: rotate(-8deg);
}

.cap--tilt {
  transform: rotate(-22deg);
  animation: cap-float-tilt 11s ease-in-out infinite;
}
.cap--lay {
  transform: rotate(76deg);
  animation: cap-float-lay 12s ease-in-out infinite;
}

.cap--xs   { --cap-size: 12px; }
.cap--sm   { --cap-size: 22px; }
.cap--md   { --cap-size: 36px; }
.cap--lg   { --cap-size: 64px; }
.cap--hero { --cap-size: 110px; }


.cap--ember {
  background:
    radial-gradient(ellipse 18% 9% at 30% 10%, rgba(255,255,255,1), rgba(255,255,255,0) 65%),
    radial-gradient(ellipse 65% 26% at 50% 16%, rgba(255,180,120,0.95), rgba(255,180,120,0) 70%),
    radial-gradient(ellipse 90% 50% at 50% 54%, rgba(255,170,100,0.95) 0%, rgba(232,93,44,0.95) 50%, rgba(120,40,15,0.7) 100%),
    radial-gradient(ellipse 80% 28% at 50% 88%, rgba(255,214,132,0.7), rgba(255,214,132,0) 70%),
    radial-gradient(ellipse 55% 20% at 50% 96%, rgba(60,20,10,0.6), rgba(0,0,0,0) 80%),
    #2a1408;
}
.cap--blood {
  background:
    radial-gradient(ellipse 18% 9% at 30% 10%, rgba(255,255,255,1), rgba(255,255,255,0) 65%),
    radial-gradient(ellipse 65% 26% at 50% 16%, rgba(255,140,140,0.9), rgba(255,140,140,0) 70%),
    radial-gradient(ellipse 90% 50% at 50% 54%, rgba(232,93,93,0.95) 0%, rgba(185,28,28,0.95) 50%, rgba(80,15,15,0.7) 100%),
    radial-gradient(ellipse 80% 28% at 50% 88%, rgba(255,180,140,0.6), rgba(255,180,140,0) 70%),
    radial-gradient(ellipse 55% 20% at 50% 96%, rgba(40,8,8,0.6), rgba(0,0,0,0) 80%),
    #1a0606;
}
.cap--plum {
  background:
    radial-gradient(ellipse 18% 9% at 30% 10%, rgba(255,255,255,1), rgba(255,255,255,0) 65%),
    radial-gradient(ellipse 65% 26% at 50% 16%, rgba(220,170,210,0.95), rgba(220,170,210,0) 70%),
    radial-gradient(ellipse 90% 50% at 50% 54%, rgba(180,130,170,0.95) 0%, rgba(107,58,79,0.95) 50%, rgba(50,20,35,0.7) 100%),
    radial-gradient(ellipse 80% 28% at 50% 88%, rgba(120,213,232,0.5), rgba(120,213,232,0) 70%),
    radial-gradient(ellipse 55% 20% at 50% 96%, rgba(20,10,15,0.6), rgba(0,0,0,0) 80%),
    #15080f;
}
.cap--gold {
  background:
    radial-gradient(ellipse 18% 9% at 30% 10%, rgba(255,255,255,1), rgba(255,255,255,0) 65%),
    radial-gradient(ellipse 65% 26% at 50% 16%, rgba(255,230,170,0.95), rgba(255,230,170,0) 70%),
    radial-gradient(ellipse 90% 50% at 50% 54%, rgba(255,210,100,0.95) 0%, rgba(212,149,26,0.95) 50%, rgba(100,65,10,0.7) 100%),
    radial-gradient(ellipse 80% 28% at 50% 88%, rgba(255,180,140,0.6), rgba(255,180,140,0) 70%),
    radial-gradient(ellipse 55% 20% at 50% 96%, rgba(40,25,5,0.6), rgba(0,0,0,0) 80%),
    #1c1206;
}
.cap--cyan {
  background:
    radial-gradient(ellipse 18% 9% at 30% 10%, rgba(255,255,255,1), rgba(255,255,255,0) 65%),
    radial-gradient(ellipse 65% 26% at 50% 16%, rgba(180,240,255,0.95), rgba(180,240,255,0) 70%),
    radial-gradient(ellipse 90% 50% at 50% 54%, rgba(120,213,232,0.95) 0%, rgba(60,160,200,0.95) 50%, rgba(15,55,80,0.7) 100%),
    radial-gradient(ellipse 80% 28% at 50% 88%, rgba(255,180,200,0.5), rgba(255,180,200,0) 70%),
    radial-gradient(ellipse 55% 20% at 50% 96%, rgba(5,20,30,0.6), rgba(0,0,0,0) 80%),
    #06141a;
}

@keyframes cap-float {
  0%, 100% { transform: translateY(0) rotate(-12deg); }
  50%      { transform: translateY(-6px) rotate(-9deg); }
}
@keyframes cap-float-tilt {
  0%, 100% { transform: translateY(0) rotate(-22deg); }
  50%      { transform: translateY(-8px) rotate(-18deg); }
}
@keyframes cap-float-lay {
  0%, 100% { transform: translateY(0) rotate(76deg); }
  50%      { transform: translateY(-6px) rotate(80deg); }
}
@keyframes cap-rim {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .cap, .cap::before { animation: none !important; }
}


.brain-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
}

.brain-orb {
  position: relative;
  width: 280px;
  height: 280px;
}
.brain-orb__halo {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 50% 50%,
      rgba(255,107,176,0.5) 0%,
      rgba(255,180,80,0.3) 30%,
      rgba(120,213,232,0.2) 55%,
      transparent 70%);
  filter: blur(30px);
  border-radius: 50%;
  animation: brain-pulse 4s ease-in-out infinite;
  z-index: 0;
}
.brain-orb__capsule {
  position: absolute;
  inset: 18%;
  z-index: 2;
  --cap-size: 90px;
  width: var(--cap-size);
  height: calc(var(--cap-size) * 2);
  left: 50%;
  top: 50%;
  margin-left: calc(var(--cap-size) * -0.5);
  margin-top: calc(var(--cap-size) * -1);
}


.brain-orb__wires {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  animation: brain-rotate 30s linear infinite;
}


.brain-orb__particles {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  transform-style: preserve-3d;
}
.brain-orb__particles span {
  position: absolute;
  top: 50%; left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  box-shadow:
    0 0 6px #ffd684,
    0 0 12px #ff6bb0,
    0 0 24px rgba(255,107,176,0.5);
  margin: -3px 0 0 -3px;
}

@keyframes brain-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.08); }
}
@keyframes brain-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .brain-orb__halo, .brain-orb__wires { animation: none; }
}




body {
  background:
    radial-gradient(ellipse at 30% 10%, rgba(232, 93, 44, 0.06), transparent 60%),
    radial-gradient(ellipse at 80% 90%, rgba(74, 169, 196, 0.05), transparent 60%),
    var(--paper);
}

.cosmos {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.cosmos__orb { display: none !important; }


.cosmos__stars {
  position: absolute;
  inset: 0;
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  color: rgba(26, 22, 20, 0.18);
  pointer-events: none;
  user-select: none;
  letter-spacing: 0.4em;
  line-height: 2.6;
  font-size: 13px;
  white-space: pre-wrap;
  padding: 40px;
  animation: stars-twinkle 8s steps(8) infinite;
}
.cosmos__stars--mid {
  color: rgba(232, 93, 44, 0.28);
  font-size: 16px;
  letter-spacing: 0.6em;
  line-height: 3.4;
  animation: stars-twinkle 11s steps(6) infinite reverse;
  transform: translate(20px, 30px);
}
.cosmos__stars--far {
  color: rgba(107, 58, 79, 0.22);
  font-size: 11px;
  letter-spacing: 0.3em;
  line-height: 2.2;
  animation: stars-drift 120s linear infinite;
  transform: translate(60px, 80px);
}

@keyframes stars-twinkle {
  0%, 100% { opacity: 1; }
  25%      { opacity: 0.4; }
  50%      { opacity: 0.8; }
  75%      { opacity: 0.3; }
}
@keyframes stars-drift {
  from { transform: translate3d(60px, 80px, 0); }
  to   { transform: translate3d(-60px, -80px, 0); }
}


.cosmos__caps {
  position: absolute;
  inset: 0;
  perspective: 1800px;
  transform-style: preserve-3d;
  mix-blend-mode: multiply;
}

.cosmos__cap {
  position: absolute;
  border-radius: 999px;
  transform-style: preserve-3d;
  will-change: transform;
  
  filter: saturate(1.6) brightness(1.05);
  border: 1.5px solid rgba(26, 22, 20, 0.6);
}


.cosmos__cap::before {
  content: "";
  position: absolute;
  inset: 8px -8px -10px 4px;
  border-radius: 999px;
  background: rgba(26, 22, 20, 0.18);
  z-index: -1;
  filter: blur(0.5px);
}


.cosmos__cap::after {
  content: "";
  position: absolute;
  inset: 12% 18%;
  border-radius: 999px;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.35) 1px, transparent 1.5px);
  background-size: 5px 5px;
  mix-blend-mode: screen;
  pointer-events: none;
}


.cosmos__cap--c1  { background: #C73E3A; width: 130px; height: 260px; top: 8%;  left: 4%;  animation: cap3d-1 38s ease-in-out infinite; }      
.cosmos__cap--c2  { background: #B95174; width: 80px;  height: 160px; top: 16%; left: 78%; animation: cap3d-2 44s ease-in-out infinite -6s; }  
.cosmos__cap--c3  { background: #C8A951; width: 100px; height: 200px; top: 64%; left: 10%; animation: cap3d-3 36s ease-in-out infinite -12s; } 
.cosmos__cap--c4  { background: #5E8B7E; width: 150px; height: 300px; top: 46%; left: 84%; animation: cap3d-4 42s ease-in-out infinite -3s; }  
.cosmos__cap--c5  { background: #4B3F72; width: 70px;  height: 140px; top: 82%; left: 36%; animation: cap3d-5 30s ease-in-out infinite -14s; } 
.cosmos__cap--c6  { background: #7B68A6; width: 90px;  height: 180px; top: 4%;  left: 44%; animation: cap3d-6 46s ease-in-out infinite -8s; }  
.cosmos__cap--c7  { background: #50C878; width: 60px;  height: 120px; top: 38%; left: 56%; animation: cap3d-7 32s ease-in-out infinite -18s; } 
.cosmos__cap--c8  { background: #722F37; width: 110px; height: 220px; top: 72%; left: 62%; animation: cap3d-8 48s ease-in-out infinite -4s; }  
.cosmos__cap--c9  { background: #E59866; width: 95px;  height: 190px; top: 28%; left: 28%; animation: cap3d-1 40s ease-in-out infinite -16s; } 
.cosmos__cap--c10 { background: #1B6E8C; width: 75px;  height: 150px; top: 88%; left: 88%; animation: cap3d-2 38s ease-in-out infinite -22s; } 
.cosmos__cap--c11 { background: #DDA0A4; width: 65px;  height: 130px; top: 56%; left: 38%; animation: cap3d-5 34s ease-in-out infinite -9s; }  
.cosmos__cap--c12 { background: #36454F; width: 50px;  height: 100px; top: 18%; left: 14%; animation: cap3d-7 28s ease-in-out infinite -24s; } 

@keyframes cap3d-1 {
  0%, 100% { transform: translate3d(0,0,0) rotate(-15deg) rotateY(0deg); }
  50%      { transform: translate3d(50px,-70px,0) rotate(8deg) rotateY(40deg); }
}
@keyframes cap3d-2 {
  0%, 100% { transform: translate3d(0,0,0) rotate(25deg) rotateY(20deg); }
  50%      { transform: translate3d(-60px,80px,0) rotate(-18deg) rotateY(-30deg); }
}
@keyframes cap3d-3 {
  0%, 100% { transform: translate3d(0,0,0) rotate(38deg) rotateY(-25deg); }
  50%      { transform: translate3d(70px,-50px,0) rotate(-22deg) rotateY(15deg); }
}
@keyframes cap3d-4 {
  0%, 100% { transform: translate3d(0,0,0) rotate(-28deg) rotateY(-15deg); }
  50%      { transform: translate3d(-50px,-90px,0) rotate(18deg) rotateY(35deg); }
}
@keyframes cap3d-5 {
  0%, 100% { transform: translate3d(0,0,0) rotate(48deg) rotateY(0deg); }
  50%      { transform: translate3d(80px,50px,0) rotate(-12deg) rotateY(-40deg); }
}
@keyframes cap3d-6 {
  0%, 100% { transform: translate3d(0,0,0) rotate(62deg) rotateY(30deg); }
  50%      { transform: translate3d(-70px,60px,0) rotate(22deg) rotateY(-20deg); }
}
@keyframes cap3d-7 {
  0%, 100% { transform: translate3d(0,0,0) rotate(-32deg) rotateY(-35deg); }
  50%      { transform: translate3d(60px,-70px,0) rotate(42deg) rotateY(25deg); }
}
@keyframes cap3d-8 {
  0%, 100% { transform: translate3d(0,0,0) rotate(18deg) rotateY(-20deg); }
  50%      { transform: translate3d(-80px,40px,0) rotate(-32deg) rotateY(20deg); }
}


.cosmos__lines {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.cosmos__line {
  position: absolute;
  height: 1px;
  background: rgba(26, 22, 20, 0.12);
  transform-origin: left center;
}
.cosmos__line::before,
.cosmos__line::after {
  content: "";
  position: absolute;
  width: 6px;
  height: 6px;
  border: 1px solid rgba(26, 22, 20, 0.4);
  background: var(--paper);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}
.cosmos__line::before { left: -3px; }
.cosmos__line::after  { right: -3px; }

.cosmos__line--1 { top: 22%; left: 8%;  width: 220px; transform: rotate(8deg);   animation: line-pulse 14s ease-in-out infinite; }
.cosmos__line--2 { top: 56%; left: 70%; width: 180px; transform: rotate(-15deg); animation: line-pulse 18s ease-in-out infinite -4s; }
.cosmos__line--3 { top: 78%; left: 28%; width: 240px; transform: rotate(22deg);  animation: line-pulse 16s ease-in-out infinite -7s; }
.cosmos__line--4 { top: 14%; left: 52%; width: 160px; transform: rotate(-30deg); animation: line-pulse 20s ease-in-out infinite -11s; }

@keyframes line-pulse {
  0%, 100% { opacity: 0.3; transform-origin: left; }
  50%      { opacity: 1; }
}


.cosmos__shoot {
  position: absolute;
  font-family: 'Instrument Serif', Georgia, serif;
  font-style: italic;
  font-size: 56px;
  font-weight: 400;
  letter-spacing: -0.03em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(232, 93, 44, 0.85);
  text-stroke: 1px rgba(232, 93, 44, 0.85);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate3d(110vw, 0, 0) skewX(-8deg);
}
.cosmos__shoot::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 100%;
  margin-left: 8px;
  width: 200px;
  height: 1.5px;
  background: linear-gradient(90deg, rgba(232, 93, 44, 0.7), transparent);
  transform: translateY(-50%);
}

.cosmos__shoot--1 { top: 18%; animation: shoot-fly 9s linear infinite; animation-delay: 0s;  }
.cosmos__shoot--2 { top: 38%; animation: shoot-fly 11s linear infinite; animation-delay: 3s; -webkit-text-stroke-color: rgba(212, 149, 26, 0.85); color: transparent; }
.cosmos__shoot--3 { top: 62%; animation: shoot-fly 10s linear infinite; animation-delay: 6s; -webkit-text-stroke-color: rgba(107, 58, 79, 0.85); }
.cosmos__shoot--4 { top: 82%; animation: shoot-fly 12s linear infinite; animation-delay: 9s; -webkit-text-stroke-color: rgba(180, 40, 55, 0.75); }
.cosmos__shoot--5 { top: 28%; animation: shoot-fly 8s  linear infinite; animation-delay: 12s; -webkit-text-stroke-color: rgba(74, 169, 196, 0.75); }

@keyframes shoot-fly {
  0%   { transform: translate3d(110vw, 0, 0) skewX(-8deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translate3d(-50vw, 0, 0) skewX(-8deg); opacity: 0; }
}


.cosmos__noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.085 0 0 0 0 0.08 0 0 0 0.45 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 280px 280px;
  opacity: 0.5;
  mix-blend-mode: multiply;
  animation: noise-shift 0.8s steps(4) infinite;
}
@keyframes noise-shift {
  0%   { transform: translate(0,0); }
  25%  { transform: translate(-3px,2px); }
  50%  { transform: translate(2px,-3px); }
  75%  { transform: translate(-2px,-1px); }
  100% { transform: translate(1px,2px); }
}


.cosmos__veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 0%,   rgba(232, 93, 44, 0.04), transparent 60%),
    radial-gradient(ellipse at 100% 50%, rgba(74, 169, 196, 0.04), transparent 60%);
  mix-blend-mode: multiply;
  pointer-events: none;
}


@media (prefers-reduced-motion: reduce) {
  .cosmos__cap, .cosmos__stars, .cosmos__shoot, .cosmos__noise, .cosmos__line {
    animation: none !important;
  }
}

.app-shell { position: relative; z-index: 1; }




.dock {
  --dock-w: 220px;
}
.dock__inner {
  border-radius: 28px !important;
  padding: 16px 14px !important;
  gap: 8px !important;
  align-items: stretch !important;
  width: 100%;
  background: rgba(255,255,255,0.85) !important;
}
.dock-item {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 14px !important;
  padding: 10px 14px !important;
  border-radius: 18px !important;
  transition: background 0.25s, transform 0.25s !important;
  width: 100%;
}
.dock-item:hover {
  background: var(--bg-2) !important;
}
.dock-item.is-active {
  background: var(--ember-soft) !important;
}
.dock-item.is-active::before { display: none; }
.dock-item__cap {
  width: 22px !important;
  height: 44px !important;
  --cap-size: 22px !important;
  filter: brightness(1.15) saturate(1.2) drop-shadow(0 4px 12px rgba(0,0,0,0.18));
  flex-shrink: 0;
}
.dock-item:hover .dock-item__cap { transform: rotate(-8deg) scale(1.15) !important; }
.dock-item.is-active .dock-item__cap { transform: rotate(-12deg) scale(1.1) !important; }

.dock-item__label {
  position: static !important;
  transform: none !important;
  background: transparent !important;
  color: var(--ink) !important;
  font-weight: 700 !important;
  font-size: 14px !important;
  padding: 0 !important;
  opacity: 1 !important;
  box-shadow: none !important;
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.dock-item.is-active .dock-item__label { color: var(--ember) !important; font-weight: 800 !important; }
.dock-divider {
  height: 1px;
  background: var(--line);
  margin: 8px 6px;
}


.who__form {
  display: flex;
  gap: 10px;
  max-width: 520px;
  margin: 0 auto 20px;
}
.who__input {
  flex: 1;
  appearance: none;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 16px 20px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.who__input:focus { border-color: var(--ember); box-shadow: 0 0 0 4px var(--ember-soft); }
.who__btn {
  appearance: none;
  border: none;
  padding: 0 28px;
  border-radius: 14px;
  background: var(--grad-ember);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.who__btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -12px rgba(232,93,44,0.5); }
.who__err {
  color: #b42837;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}
.who__hint {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 14px;
  color: var(--ink-4);
  margin: 24px 0 16px;
}


.who {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: radial-gradient(ellipse at top, #f6f1e8 0%, #ede4d2 60%, #e8dcc4 100%);
  animation: whoIn 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.who.is-gone {
  animation: whoOut 0.6s cubic-bezier(0.65, 0, 0.35, 1) forwards;
  pointer-events: none;
}
@keyframes whoIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes whoOut {
  to { opacity: 0; transform: scale(1.04); }
}
.who__inner {
  width: min(880px, 92vw);
  text-align: center;
}
.who__brand {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 24px;
}
.who__brand em {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ember);
  margin: 0 4px;
}
.who__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(48px, 7vw, 88px);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--ink);
  margin: 0 0 12px;
}
.who__title em {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  background: var(--grad-capsule);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.who__sub {
  font-family: var(--font-display);
  font-size: 17px;
  color: var(--ink-3);
  margin: 0 0 56px;
}
.who__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  max-width: 760px;
  margin: 0 auto;
}
.who-card {
  appearance: none;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 18px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.34, 1.5, 0.64, 1), border-color 0.2s, box-shadow 0.2s;
  font-family: var(--font-display);
}
.who-card:hover {
  transform: translateY(-4px) scale(1.02);
  border-color: var(--ember);
  box-shadow: 0 16px 32px -16px rgba(232, 93, 44, 0.25);
}
.who-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  color: #fff;
  letter-spacing: -0.02em;
}
.who-card__name {
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  letter-spacing: -0.01em;
  text-align: center;
}


.page-id {
  position: relative;
  padding: 36px 44px 44px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  border-bottom: 1px solid var(--line);
}
.page-id::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.12;
  pointer-events: none;
  z-index: 0;
}
.page-id[data-page="fiche"]::before {
  background: radial-gradient(ellipse at left, var(--ember) 0%, transparent 60%);
}
.page-id[data-page="classement"]::before {
  background: radial-gradient(ellipse at left, #e3a847 0%, transparent 60%);
}
.page-id[data-page="planner"]::before {
  background: radial-gradient(ellipse at left, var(--plum) 0%, transparent 60%);
}
.page-id > * { position: relative; z-index: 1; }

.page-id__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(56px, 7vw, 96px);
  line-height: 1.05;
  letter-spacing: -0.045em;
  margin: 0;
  padding-bottom: 0.05em;
  color: var(--ink);
}
.page-id__title em {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
}
.page-id[data-page="fiche"] .page-id__title em {
  background: var(--grad-ember);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.page-id[data-page="classement"] .page-id__title em {
  background: linear-gradient(135deg, #e3a847, #b07d1f);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.page-id[data-page="planner"] .page-id__title em {
  background: linear-gradient(135deg, var(--plum), #6b3a4f);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.page-id__date {
  text-align: right;
  font-family: var(--font-display);
}
.page-id__date-day {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 4px;
}
.page-id__date-num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 38px;
  line-height: 1;
  color: var(--ink);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.page-id__date-month {
  font-size: 14px;
  color: var(--ink-3);
  font-weight: 500;
  margin-top: 4px;
}


.user-chip {
  position: fixed;
  top: 22px;
  right: calc(var(--dock-w) + 24px);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 8px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.2s;
  white-space: nowrap;
}
.user-chip:hover { border-color: var(--ember); }
.user-chip__av {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--grad-ember);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
}
.user-chip__sub {
  color: var(--ink-3);
  font-weight: 500;
  font-size: 11px;
}


.fiche-stage {
  padding: 40px 44px 80px;
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.today-card {
  position: relative;
  background: #fff;
  border: 2px solid var(--ember);
  border-radius: 28px;
  padding: 36px 40px;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.6) inset,
    0 24px 60px -30px rgba(232, 93, 44, 0.45),
    0 8px 24px -16px rgba(0,0,0,0.1);
  overflow: hidden;
}
.today-card::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -10%;
  width: 60%;
  height: 200%;
  background: radial-gradient(ellipse, rgba(232, 93, 44, 0.10), transparent 70%);
  pointer-events: none;
}
.today-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
  position: relative;
}
.today-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 12px;
  background: var(--grad-ember);
  color: #fff;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 18px;
  white-space: nowrap;
  width: fit-content;
}
.today-card__badge .pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.4); }
}
.today-card__date {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(40px, 5vw, 64px);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--ink);
}
.today-card__date em {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  background: var(--grad-ember);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.today-card__day {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  margin-top: 8px;
}
.today-card__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.today-card__score-big {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 56px;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  background: var(--grad-ember);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 0.9;
}
.today-card__score-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-3);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}


.fields {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  position: relative;
}
.field {
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  padding: 18px 18px 16px;
  transition: border-color 0.2s, transform 0.2s;
  cursor: text;
}
.field:hover { border-color: var(--ember); }
.field:focus-within {
  border-color: var(--ember);
  box-shadow: 0 0 0 4px var(--ember-soft);
}
.field__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-3);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.field__cap {
  width: 7px;
  height: 14px;
  border-radius: 999px;
  background: var(--grad-ember);
  display: inline-block;
  transform: rotate(-12deg);
}
.field--dm .field__cap   { background: linear-gradient(180deg,#fbbf24,#d4951a); }
.field--vid .field__cap  { background: var(--grad-capsule); }
.field--live .field__cap { background: var(--grad-blood); }
.field--ca .field__cap   { background: linear-gradient(180deg,#78d5e8,#4aa9c4); }

.field__input {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  padding: 0;
  margin: 0;
}
.field__input::placeholder {
  color: var(--ink-5);
  font-weight: 700;
}
.field__suffix {
  display: inline-block;
  margin-left: 4px;
  color: var(--ink-4);
  font-weight: 600;
  font-size: 24px;
}

.field--live .field__live-toggle {
  width: 100%;
  height: 50px;
  background: var(--bg-2);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 14px;
  color: var(--ink-3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: background 0.3s;
  user-select: none;
}
.field--live .field__live-toggle.is-on {
  background: var(--grad-blood);
  color: #fff;
}
.field--live .field__live-toggle::before {
  content: "OFF";
}
.field--live .field__live-toggle.is-on::before { content: "ON"; }
.field--live .field__live-toggle::after {
  content: "";
  position: absolute;
  right: 10px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--ink-4);
  transition: all 0.3s;
}
.field--live .field__live-toggle.is-on::after {
  border-color: #fff;
  background: var(--blood);
  box-shadow: 0 0 0 4px rgba(255,255,255,0.3);
}


.past-card {
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 24px;
  overflow: hidden;
  transition: border-color 0.3s;
}
.past-card.is-open { border-color: var(--ink-3); }

.past-card__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 24px 32px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-display);
  text-align: left;
}
.past-card__trigger:hover {
  background: var(--bg-2);
}
.past-card__trigger-left {
  display: flex;
  align-items: center;
  gap: 18px;
}
.past-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--bg-2);
  display: grid;
  place-items: center;
  font-size: 22px;
  transition: transform 0.3s cubic-bezier(0.34, 1.5, 0.64, 1);
}
.past-card.is-open .past-card__icon {
  transform: rotate(180deg);
  background: var(--ink);
  color: #fff;
}
.past-card__title {
  font-size: 30px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.025em;
  margin-bottom: 4px;
  line-height: 1.05;
}
.past-card__sub {
  font-size: 14px;
  color: var(--ink-3);
}
.past-card__chevron {
  font-size: 20px;
  color: var(--ink-4);
  transition: transform 0.3s;
}
.past-card.is-open .past-card__chevron { transform: rotate(180deg); }

.past-card__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.5s cubic-bezier(0.65, 0, 0.35, 1);
}
.past-card.is-open .past-card__body {
  grid-template-rows: 1fr;
}
.past-card__body-inner {
  overflow: hidden;
}
.past-card__content {
  padding: 0 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: pastSlide 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
}
@keyframes pastSlide {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--bg-2);
  border-radius: 14px;
}
.date-picker__label {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.date-picker__input {
  appearance: none;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  outline: none;
  transition: border-color 0.2s;
}
.date-picker__input:focus { border-color: var(--ember); }


.tiny-help {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-4);
  letter-spacing: 0.01em;
}
.tiny-help::before, .tiny-help::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--line), transparent);
  max-width: 120px;
}


.formula-foot {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 32px 0 12px;
  border-top: 1px dashed var(--line);
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: 11px;
  color: var(--ink-4);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  flex-wrap: wrap;
}
.formula-foot b {
  color: var(--ink);
  font-weight: 800;
}


.recap {
  margin-top: 24px;
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 24px;
  padding: 32px 36px;
  font-family: var(--font-display);
}
.recap__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px dashed var(--line);
  margin-bottom: 24px;
}
.recap__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.recap__score { text-align: right; display: flex; align-items: baseline; gap: 12px; }
.recap__score-num {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  background: var(--grad-ember);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}
.recap__score-label {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 600;
  font-size: 18px;
  color: var(--ink-3);
}
.recap__breakdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.recap-row {
  display: grid;
  grid-template-columns: 1fr auto 60px auto;
  align-items: center;
  gap: 18px;
  padding: 14px 4px;
  border-bottom: 1px solid var(--line);
  font-size: 15px;
}
.recap-row:last-of-type { border-bottom: none; }
.recap-row > span:first-child {
  color: var(--ink-3);
  font-weight: 600;
  letter-spacing: -0.005em;
}
.recap-row > b {
  font-weight: 800;
  font-size: 22px;
  color: var(--ink);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.recap-row__x {
  text-align: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 12px;
  color: var(--ink-4);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.recap-row__pts {
  background: var(--ember-soft) !important;
  color: var(--ember) !important;
  font-size: 16px !important;
  padding: 4px 14px;
  border-radius: 999px;
  min-width: 64px;
  text-align: center !important;
}
.recap-row--ca {
  grid-template-columns: 1fr auto;
  margin-top: 8px;
  padding-top: 18px;
  border-top: 1px dashed var(--line);
  border-bottom: none !important;
}
.recap-row--ca > b {
  font-size: 28px;
  background: var(--grad-ember);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.recap .formula-foot {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px dashed var(--line);
}


.recap-flow {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.recap-flow-row {
  display: grid;
  grid-template-columns: 1.4fr 80px minmax(80px, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 14px 18px;
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 18px;
  transition: border-color 0.2s, transform 0.2s;
  font-family: var(--font-display);
}
.recap-flow-row:hover { transform: translateX(4px); }
.recap-flow-row.r-ember { border-color: rgba(232,93,44,0.25); color: var(--ember); }
.recap-flow-row.r-gold  { border-color: rgba(212,149,26,0.30); color: #b07d1f; }
.recap-flow-row.r-plum  { border-color: rgba(167,107,135,0.35); color: #6b3a4f; }
.recap-flow-row.r-blood { border-color: rgba(180,40,55,0.30);  color: #b42837; }

.rf-label {
  font-weight: 700;
  font-size: 17px;
  color: var(--ink);
  letter-spacing: -0.015em;
}
.rf-val {
  font-weight: 800;
  font-size: 32px;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  text-align: center;
  line-height: 1;
}
.rf-arrow {
  width: 100%;
  height: 28px;
  display: block;
}
.rf-pts {
  font-weight: 800;
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  text-align: right;
  color: inherit;
  white-space: nowrap;
}
.rf-pts span {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-left: 4px;
  opacity: 0.75;
}
.recap-flow-row.r-ca {
  grid-template-columns: 1.4fr 1fr;
  margin-top: 12px;
  background: linear-gradient(135deg, rgba(232,93,44,0.06), rgba(212,149,26,0.06));
  border: 1.5px dashed rgba(232,93,44,0.35);
}
.rf-val--ca {
  font-size: 36px;
  background: var(--grad-ember);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-align: right;
}


@media (max-width: 1100px) {
  .fields { grid-template-columns: repeat(2, 1fr) !important; }
  .recap-flow-row { grid-template-columns: 1.2fr 60px minmax(70px,1fr) auto; gap: 12px; padding: 12px 14px; }
  .rf-val { font-size: 26px; }
  .rf-pts { font-size: 20px; }
}

@media (max-width: 860px) {
  .app {
    grid-template-columns: 1fr !important;
    grid-template-areas: "header" "main" "dock" !important;
  }
  .dock {
    position: fixed !important;
    bottom: 0; left: 0; right: 0; top: auto !important;
    height: auto !important;
    width: 100% !important;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom)) !important;
    z-index: 80;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid var(--line);
  }
  .dock__inner {
    flex-direction: row !important;
    border-radius: 18px !important;
    gap: 4px !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    justify-content: space-around;
  }
  .dock-divider { display: none; }
  .dock-item {
    flex-direction: column !important;
    flex: 1;
    padding: 6px 4px !important;
    gap: 4px !important;
    min-width: 0;
  }
  .dock-item__cap {
    width: 18px !important;
    height: 36px !important;
    --cap-size: 18px !important;
  }
  .dock-item__label {
    font-size: 11px !important;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .user-chip {
    right: 16px !important;
    top: 16px !important;
  }
  .page-id {
    flex-direction: column !important;
    align-items: flex-start !important;
    padding: 24px 20px 28px !important;
    gap: 14px;
  }
  .page-id__title {
    font-size: clamp(40px, 11vw, 64px) !important;
  }
  .page-id__date {
    text-align: left;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .page-id__date-num { font-size: 28px; }
  .page-id__date-day { margin-bottom: 0; }
  .fiche-stage {
    padding: 24px 16px 120px !important;
    gap: 18px !important;
  }
  .today-card {
    padding: 24px 22px !important;
    border-radius: 22px !important;
  }
  .today-card__date { font-size: 36px !important; }
  .today-card__day { font-size: 12px !important; }
  .fields {
    grid-template-columns: 1fr 1fr !important;
    gap: 10px !important;
  }
  .field { padding: 14px 14px 12px !important; border-radius: 14px !important; }
  .field__input { font-size: 28px !important; }
  .past-card__trigger { padding: 18px 20px !important; }
  .past-card__title { font-size: 22px !important; }
  .past-card__sub { font-size: 12px !important; }
  .past-card__icon { width: 38px !important; height: 38px !important; font-size: 18px; }
  .past-card__content { padding: 0 20px 24px !important; }
  .recap { padding: 22px 18px !important; border-radius: 20px !important; }
  .recap__head { flex-direction: column; align-items: flex-start; gap: 8px; }
  .recap__score-num { font-size: 44px; }
  .recap-flow-row {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 4px 12px;
    padding: 14px 16px;
  }
  .rf-label { grid-column: 1; grid-row: 1; font-size: 15px; }
  .rf-val   { grid-column: 2; grid-row: 1; font-size: 22px; text-align: right; }
  .rf-arrow {
    grid-column: 1 / -1; grid-row: 2;
    height: 22px;
    transform: rotate(90deg);
    width: 60px;
    margin: 4px auto -4px;
  }
  .rf-pts { grid-column: 1 / -1; grid-row: 3; text-align: center; font-size: 20px; }
  .recap-flow-row.r-ca { grid-template-columns: 1fr; grid-template-rows: auto auto; }
  .recap-flow-row.r-ca .rf-label { grid-column: 1; }
  .rf-val--ca { font-size: 28px; text-align: left; grid-column: 1; }
  
  .app-header { padding: 14px 16px !important; }
  .who-card { padding: 16px 12px !important; }
  .who-card__avatar { width: 44px !important; height: 44px !important; font-size: 18px !important; }
  .who-card__name { font-size: 12px !important; }
  .who__grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)) !important; gap: 10px !important; }
}

@media (max-width: 480px) {
  .fields { grid-template-columns: 1fr !important; }
  .field--live, .field--ca { grid-column: 1 / -1 !important; }
  .who__grid { grid-template-columns: repeat(2, 1fr) !important; }
}


.tabstrip { display: none !important; }
.app-header .user-pill { display: none !important; }
.app-header .month-picker { display: none !important; }


.app-header {
  padding: 18px 36px 18px 36px !important;
  border-bottom: none !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
.brand__name { font-size: 15px !important; }
.brand__sub { font-size: 10px !important; }



.app {
  position: relative;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr var(--dock-w);
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "header  header"
    "main    dock";
  gap: 0;
}


.app-header {
  grid-area: header;
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 36px 22px 44px;
  background: linear-gradient(180deg, rgba(246,241,232,0.92), rgba(246,241,232,0.65));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
}
.brand__caps {
  width: 30px;
  height: 60px;
  --cap-size: 30px;
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}
.brand__name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 17px;
  color: var(--ink);
  letter-spacing: -0.02em;
  line-height: 1;
}
.brand__sub {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-3);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 4px;
}

.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px 8px 8px;
  border-radius: 999px;
  background: var(--paper-soft);
  border: 1px solid var(--line);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
  transition: all .25s ease;
}
.user-pill:hover { transform: translateY(-1px); box-shadow: var(--shadow-2); }
.user-pill__avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--grad-ember);
  color: #fff;
  display: grid; place-items: center;
  font-weight: 800; font-size: 12px;
  letter-spacing: 0;
}

.month-picker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: var(--paper-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
  transition: all .25s ease;
}
.month-picker:hover { border-color: var(--ember); color: var(--ember); }


.tabstrip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 44px;
  background: transparent;
  border-bottom: 1px solid var(--line);
}
.tab {
  position: relative;
  padding: 16px 22px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 14px;
  color: var(--ink-3);
  cursor: pointer;
  border: none;
  background: none;
  transition: color .2s ease;
  letter-spacing: -0.01em;
}
.tab:hover { color: var(--ink); }
.tab.is-active { color: var(--ink); }
.tab.is-active::after {
  content: "";
  position: absolute;
  left: 22px; right: 22px;
  bottom: -1px; height: 2px;
  background: var(--grad-ember);
  border-radius: 2px;
}
.tab__cap {
  display: inline-block;
  width: 6px; height: 12px;
  border-radius: 999px;
  background: var(--ember);
  margin-right: 8px;
  vertical-align: middle;
  transform: rotate(-22deg);
  box-shadow: 0 0 8px rgba(232,93,44,0.4);
}
.tab[data-color="gold"] .tab__cap   { background: var(--gold); box-shadow: 0 0 8px rgba(212,149,26,0.4); }
.tab[data-color="plum"] .tab__cap   { background: var(--plum); box-shadow: 0 0 8px rgba(107,58,79,0.4); }
.tab[data-color="cyan"] .tab__cap   { background: #4aa9c4; box-shadow: 0 0 8px rgba(74,169,196,0.4); }


.dock {
  grid-area: dock;
  position: sticky;
  top: 88px;
  align-self: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 24px 12px;
  height: calc(100vh - 88px);
  z-index: 40;
}
.dock__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  padding: 22px 14px;
  background: rgba(250,246,238,0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-2);
}

.dock-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dock-item__cap {
  position: relative;
  width: 28px;
  height: 56px;
  --cap-size: 28px;
  border-radius: 999px;
  flex-shrink: 0;
  transition: transform .35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .35s ease;
}
.dock-item:hover .dock-item__cap {
  transform: scale(1.55) rotate(-8deg);
}
.dock-item.is-active .dock-item__cap {
  transform: scale(1.35);
}
.dock-item.is-active::before {
  content: "";
  position: absolute;
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  border-radius: 999px;
  background: var(--ink);
}


.dock-item__label {
  position: absolute;
  right: calc(100% + 18px);
  top: 50%;
  transform: translateY(-50%) translateX(6px);
  white-space: nowrap;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.02em;
  opacity: 0;
  pointer-events: none;
  transition: all .25s ease;
  box-shadow: var(--shadow-2);
}
.dock-item:hover .dock-item__label {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.dock-divider {
  width: 24px;
  height: 1px;
  background: var(--line-strong);
  margin: 4px 0;
}


.app-main {
  grid-area: main;
  padding: 0;
  position: relative;
  overflow: hidden;
}

.view {
  padding: 36px 44px 60px 44px;
  max-width: 1400px;
}
.view__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 32px;
}
.view__title {
  font-family: var(--font-display);
  font-size: clamp(32px, 3.6vw, 44px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--ink);
}
.view__title em {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 700;
  background: var(--grad-capsule);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.view__sub {
  margin-top: 10px;
  font-size: 14px;
  color: var(--ink-3);
  max-width: 540px;
  line-height: 1.55;
}


.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}
.kpi {
  position: relative;
  padding: 20px 22px;
  background: var(--paper-soft);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  transition: transform .3s ease, border-color .3s ease, box-shadow .3s ease;
}
.kpi:hover { transform: translateY(-3px); border-color: var(--line-strong); box-shadow: var(--shadow-2); }
.kpi__label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: flex;
  align-items: center;
  gap: 8px;
}
.kpi__cap {
  display: inline-block;
  width: 6px; height: 12px;
  border-radius: 999px;
  background: var(--ember);
  transform: rotate(-22deg);
}
.kpi[data-color="gold"] .kpi__cap   { background: var(--gold); }
.kpi[data-color="plum"] .kpi__cap   { background: var(--plum); }
.kpi[data-color="cyan"] .kpi__cap   { background: #4aa9c4; }
.kpi__value {
  font-family: var(--font-display);
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--ink);
  margin-top: 10px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.kpi__delta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ink-3);
  font-family: var(--font-display);
}
.kpi__delta--up { color: #2c8c4f; }
.kpi__delta--down { color: var(--blood); }
.kpi__spark {
  position: absolute;
  right: 12px; bottom: 12px;
  height: 32px;
  width: 80px;
  opacity: 0.55;
}


.formula-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: var(--paper-soft);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}
.formula-pill__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink);
}
.formula-pill__chip::before {
  content: "";
  width: 6px; height: 12px;
  border-radius: 999px;
  background: var(--ember);
  transform: rotate(-22deg);
  display: inline-block;
}
.formula-pill__chip.fp-dm::before  { background: var(--gold); }
.formula-pill__chip.fp-vid::before { background: var(--plum); }
.formula-pill__chip.fp-live::before { background: #4aa9c4; }

.legend-row {
  display: flex;
  gap: 16px;
  align-items: center;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.legend-row .dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}
.legend-row .dot.s { background: #2c8c4f; }
.legend-row .dot.l { background: var(--gold); }
.legend-row .dot.m { background: var(--blood); }

.day-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.day-card {
  position: relative;
  background: var(--paper-soft);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 18px 18px 16px;
  transition: all .3s cubic-bezier(0.34, 1.2, 0.64, 1);
  cursor: pointer;
  overflow: hidden;
}
.day-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,107,176,0.0), rgba(255,214,132,0.0), rgba(120,213,232,0.0));
  opacity: 0;
  pointer-events: none;
  transition: opacity .35s ease;
}
.day-card:hover {
  transform: translateY(-4px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-3);
}
.day-card:hover::before {
  opacity: 0.08;
  background: linear-gradient(135deg, rgba(255,107,176,0.45), rgba(255,214,132,0.45), rgba(120,213,232,0.45));
}
.day-card.s-empty { opacity: 0.55; }
.day-card.s-empty:hover { opacity: 1; }

.day-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.day-card__date {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.day-card__day {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.day-card__num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 28px;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1;
}
.day-card__status {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--line-strong);
}
.day-card__status.s { background: #2c8c4f; box-shadow: 0 0 0 4px rgba(44,140,79,0.15); }
.day-card__status.l { background: var(--gold); box-shadow: 0 0 0 4px rgba(212,149,26,0.15); }
.day-card__status.m { background: var(--blood); box-shadow: 0 0 0 4px rgba(185,28,28,0.15); }

.day-card__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 12px;
  margin-bottom: 12px;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.metric__label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: flex; align-items: center; gap: 5px;
}
.metric__label::before {
  content: "";
  width: 4px; height: 8px;
  border-radius: 999px;
  background: var(--ember);
  transform: rotate(-22deg);
}
.metric.m-dm   .metric__label::before { background: var(--gold); }
.metric.m-vid  .metric__label::before { background: var(--plum); }
.metric.m-live .metric__label::before { background: #4aa9c4; }
.metric.m-ca   .metric__label::before { background: #2c8c4f; }
.metric__value {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 18px;
  color: var(--ink);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.metric__value.is-zero { color: var(--ink-4); font-weight: 600; }

.day-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px dashed var(--line-strong);
}
.day-card__score {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 14px;
  color: var(--ember);
  letter-spacing: -0.01em;
}
.day-card__score.is-empty { color: var(--ink-4); font-weight: 600; }

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid var(--line-strong);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  transition: all .2s ease;
}
.upload-btn:hover { color: var(--ember); border-color: var(--ember); background: var(--ember-soft); }


.live-toggle {
  position: relative;
  width: 32px; height: 18px;
  border-radius: 999px;
  background: var(--line-strong);
  cursor: pointer;
  transition: background .25s ease;
  flex-shrink: 0;
}
.live-toggle::after {
  content: "";
  position: absolute;
  top: 2px; left: 2px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--paper-soft);
  transition: transform .25s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.live-toggle.is-on { background: var(--grad-ember); }
.live-toggle.is-on::after { transform: translateX(14px); }


.leaderboard {
  background: var(--paper-soft);
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: var(--shadow-1);
}
.lb__head {
  display: grid;
  grid-template-columns: 60px 1fr 200px 140px 140px 200px;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.lb__row {
  display: grid;
  grid-template-columns: 60px 1fr 200px 140px 140px 200px;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
  transition: background .25s ease;
  cursor: pointer;
}
.lb__row:last-child { border-bottom: none; }
.lb__row:hover { background: rgba(232,93,44,0.04); }

.lb__rank {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  color: var(--ink);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.lb__row.podium .lb__rank {
  width: 38px; height: 38px;
  border-radius: 50%;
  display: grid; place-items: center;
  color: var(--paper-soft);
  font-size: 16px;
}
.lb__row.r1 .lb__rank { background: var(--grad-ember); box-shadow: 0 4px 14px rgba(232,93,44,0.35); }
.lb__row.r2 .lb__rank { background: linear-gradient(135deg,#cbd5e1,#94a3b8); box-shadow: 0 4px 14px rgba(100,116,139,0.3); }
.lb__row.r3 .lb__rank { background: linear-gradient(135deg,#d4951a,#a87212); box-shadow: 0 4px 14px rgba(168,114,18,0.35); }

.lb__player {
  display: flex; align-items: center; gap: 14px;
}
.lb__avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--font-display);
  font-weight: 800; font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}
.lb__name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  color: var(--ink);
}
.lb__level {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--ink-2);
}
.lb__level .cap--xs {
  width: 8px; height: 16px;
  border-radius: 999px;
  display: inline-block;
}
.lb__streak {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--ember);
}
.lb__points {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 18px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.lb__progress {
  display: flex; align-items: center; gap: 10px;
}
.lb__bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--line-strong);
  overflow: hidden;
  position: relative;
}
.lb__bar > i {
  display: block;
  height: 100%;
  background: var(--grad-ember);
  border-radius: 999px;
}
.lb__pct {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 11px;
  color: var(--ember);
  letter-spacing: 0.08em;
}


.planner {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 18px;
}
.planner__col {
  background: var(--paper-soft);
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  padding: 22px;
  box-shadow: var(--shadow-1);
}
.planner__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 16px;
  color: var(--ink);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.ad-card {
  position: relative;
  padding: 14px 16px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  margin-bottom: 10px;
  cursor: grab;
  transition: all .25s ease;
}
.ad-card:hover { border-color: var(--ember); transform: translateX(3px); box-shadow: var(--shadow-2); }
.ad-card__type {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ember);
  margin-bottom: 4px;
}
.ad-card__title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  margin-bottom: 8px;
  letter-spacing: -0.01em;
}
.ad-card__meta {
  display: flex;
  gap: 12px;
  font-family: var(--font-display);
  font-size: 11px;
  color: var(--ink-3);
}
.ad-card__meta b { color: var(--ink); font-weight: 700; }

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}
.cal-cell {
  position: relative;
  aspect-ratio: 1;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all .2s ease;
  cursor: pointer;
  font-family: var(--font-display);
}
.cal-cell:hover { border-color: var(--ember); transform: translateY(-2px); box-shadow: var(--shadow-1); }
.cal-cell__num {
  font-weight: 800;
  font-size: 14px;
  color: var(--ink);
  letter-spacing: -0.02em;
}
.cal-cell__num.dim { color: var(--ink-4); font-weight: 600; }
.cal-cell__events {
  display: flex; gap: 3px; flex-wrap: wrap;
}
.cal-event {
  width: 6px; height: 12px;
  border-radius: 999px;
  background: var(--ember);
  transform: rotate(-22deg);
}
.cal-event.gold { background: var(--gold); }
.cal-event.plum { background: var(--plum); }
.cal-event.cyan { background: #4aa9c4; }

.cal-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.cal-head > span {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: center;
  padding: 6px 0;
}


.splash {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  background: var(--paper);
  transition: opacity .8s ease, visibility .8s;
}
.splash.is-gone { opacity: 0; visibility: hidden; pointer-events: none; }
.splash__brand {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

@media (max-width: 1100px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .lb__head, .lb__row { grid-template-columns: 50px 1fr 140px 100px 200px; }
  .lb__head > :nth-child(4), .lb__row > :nth-child(4) { display: none; }
  .planner { grid-template-columns: 1fr; }
}



.admin-stage {
  padding: 32px 44px 80px;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
}
.kpi {
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 18px;
  padding: 18px 20px 16px;
  font-family: var(--font-display);
  position: relative;
  overflow: hidden;
}
.kpi::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: var(--ink);
}
.kpi[data-accent="ember"]::before { background: var(--grad-ember); }
.kpi[data-accent="gold"]::before  { background: linear-gradient(180deg,#fbbf24,#d4951a); }
.kpi[data-accent="plum"]::before  { background: linear-gradient(180deg,#a76b87,#6b3a4f); }
.kpi[data-accent="blood"]::before { background: var(--grad-blood); }
.kpi[data-accent="cyan"]::before  { background: linear-gradient(180deg,#78d5e8,#4aa9c4); }

.kpi__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 8px;
}
.kpi__val {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  line-height: 1;
}
.kpi__sub {
  font-size: 12px;
  color: var(--ink-4);
  font-weight: 600;
  margin-top: 6px;
}

.seg {
  display: inline-flex;
  background: var(--bg-2);
  border-radius: 14px;
  padding: 4px;
  gap: 2px;
  align-self: flex-start;
}
.seg__btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 10px 18px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  color: var(--ink-3);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: -0.005em;
}
.seg__btn:hover { color: var(--ink); }
.seg__btn.is-on {
  background: #fff;
  color: var(--ink);
  box-shadow: 0 2px 8px -2px rgba(0,0,0,0.08);
}


.students {
  background: #fff;
  border: 1.5px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  font-family: var(--font-display);
}
.students__head, .student-row {
  display: grid;
  grid-template-columns: 2.2fr 1fr 1.4fr 0.7fr 0.8fr 1fr 1fr 30px;
  gap: 14px;
  align-items: center;
  padding: 14px 22px;
}
.students__head {
  background: var(--bg-2);
  border-bottom: 1px solid var(--line);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.student-row {
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.15s;
}
.student-row:last-child { border-bottom: none; }
.student-row:hover { background: var(--bg); }
.student-row.is-suspect { background: rgba(180,40,55,0.04); }
.student-row.is-suspect:hover { background: rgba(180,40,55,0.08); }

.student__id { display: flex; align-items: center; gap: 12px; }
.student__av {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: var(--grad-ember);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 15px;
  flex-shrink: 0;
}
.student__name { font-weight: 700; font-size: 14px; color: var(--ink); letter-spacing: -0.01em; }
.student__email { font-size: 11px; color: var(--ink-4); margin-top: 2px; }
.student__time { font-size: 13px; color: var(--ink-3); }
.student__streak, .student__pts, .student__ca { font-weight: 700; font-variant-numeric: tabular-nums; font-size: 14px; }
.student__missed.is-bad { color: #b42837; font-weight: 800; }
.student__chev { font-size: 22px; color: var(--ink-4); text-align: right; font-weight: 600; }

.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 999px;
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.pill--ok   { background: rgba(46,160,90,0.12);  color: #2e8758; }
.pill--miss { background: rgba(180,40,55,0.10);  color: #b42837; }


.back-btn {
  appearance: none;
  border: none;
  background: var(--bg-2);
  padding: 6px 14px;
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 12px;
  color: var(--ink-3);
  cursor: pointer;
  transition: all 0.2s;
}
.back-btn:hover { background: var(--ink); color: #fff; }

.section-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.025em;
  margin: 0;
}

.audit-warn {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 22px;
  background: rgba(180,40,55,0.06);
  border: 1.5px solid rgba(180,40,55,0.3);
  border-radius: 16px;
  font-family: var(--font-display);
  font-size: 14px;
  color: #6b1f29;
  line-height: 1.5;
}
.audit-warn span { font-size: 22px; line-height: 1; }
.audit-warn b { color: #b42837; font-weight: 800; letter-spacing: -0.01em; }


.day-grid {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 6px;
}
.day-cell {
  aspect-ratio: 1;
  background: var(--bg-2);
  border-radius: 8px;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 4px;
  font-family: var(--font-display);
  font-size: 10px;
  color: var(--ink-4);
  font-weight: 700;
}
.day-cell.is-ok {
  background: var(--grad-ember);
  color: rgba(255,255,255,0.85);
}
.day-cell.is-tamper {
  background: linear-gradient(135deg, #fbbf24, #d4951a) !important;
  color: #5a3a0a;
}
.day-cell__tag {
  position: absolute;
  top: 3px; right: 3px;
  background: #fff;
  color: #6b1f29;
  font-size: 8px;
  font-weight: 800;
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: grid;
  place-items: center;
}
.day-legend {
  display: flex;
  gap: 22px;
  font-family: var(--font-display);
  font-size: 12px;
  color: var(--ink-3);
  font-weight: 600;
}
.day-legend span { display: inline-flex; align-items: center; gap: 8px; }
.lg { width: 14px; height: 14px; border-radius: 4px; }
.lg--ok  { background: var(--grad-ember); }
.lg--ko  { background: var(--bg-2); border: 1px solid var(--line); }
.lg--mod { background: linear-gradient(135deg,#fbbf24,#d4951a); }


.audit-log {
  background: #0f0d0a;
  border-radius: 16px;
  padding: 18px 20px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12.5px;
  color: #d4c4a8;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.audit-row {
  display: grid;
  grid-template-columns: 160px 80px 1fr;
  gap: 14px;
  padding: 6px 0;
}
.audit-row.flag {
  background: rgba(232,93,44,0.08);
  margin: 0 -10px;
  padding: 6px 10px;
  border-radius: 6px;
}
.audit-row__t { color: #8a7a5e; }
.audit-row__a {
  font-weight: 800;
  letter-spacing: 0.06em;
}
.a-create { color: #6cd49a; }
.a-update { color: #fbbf24; }
.audit-row__d { color: #e8dcc4; }


.page-id[data-page="admin"]::before {
  background: radial-gradient(ellipse at left, var(--ink) 0%, transparent 60%);
  opacity: 0.06;
}
.page-id[data-page="admin"] .page-id__title em {
  background: linear-gradient(135deg, var(--ember), #b42837);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}


@media (max-width: 1100px) {
  .students__head, .student-row {
    grid-template-columns: 2fr 1fr 1.2fr 0.6fr 0.8fr 24px;
  }
  .students__head > :nth-child(6),
  .students__head > :nth-child(7),
  .student__pts, .student__ca { display: none; }
  .day-grid { grid-template-columns: repeat(10, 1fr); }
}

@media (max-width: 860px) {
  .admin-stage { padding: 20px 16px 120px; gap: 18px; }
  .students__head { display: none; }
  .student-row {
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto;
    gap: 6px 12px;
    padding: 14px 16px;
  }
  .student__id { grid-column: 1 / 3; grid-row: 1; }
  .student__chev { grid-column: 3; grid-row: 1; }
  .student__time, .student__streak, .student__missed { font-size: 11px; }
  .student-row > :nth-child(2) { grid-column: 1; grid-row: 2; }
  .student-row > :nth-child(3) { grid-column: 2 / 4; grid-row: 2; text-align: right; }
  .student-row > :nth-child(4),
  .student-row > :nth-child(5) { display: none; }
  .day-grid { grid-template-columns: repeat(7, 1fr); }
  .audit-row { grid-template-columns: 1fr; gap: 2px; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.06); }
  .kpi__val { font-size: 28px; }
}
`;
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const K=Deno.env.get("TOKEN_SECRET")||"djibril-tracking-secret-2026";
function gt(sid:string):string{const p=btoa(JSON.stringify({sid,exp:Date.now()+30*86400000}));return p+"."+btoa([...new Uint8Array(new TextEncoder().encode(p+K))].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,40))}
function vt(t:string):string|null{try{const[b64,sig]=t.split(".");if(!b64||!sig)return null;const x=btoa([...new Uint8Array(new TextEncoder().encode(b64+K))].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,40));if(sig!==x)return null;const p=JSON.parse(atob(b64));return p.exp<Date.now()?null:p.sid}catch{return null}}
async function fc(e:string,n:string,l:string){e=e.toLowerCase().trim();const{data:x}=await sb.from("students").select("*").eq("email",e).maybeSingle();if(x)return x;const{data:r}=await sb.from("students").insert({email:e,first_name:n,full_name:l}).select().single();return r}
async function hr(req:Request):Promise<Response>{const u=new URL(req.url);let p=u.pathname;const m=req.method;if(m==="OPTIONS")return new Response(null,{headers:H});
// Build base URL from the request (handles Supabase proxy URL rewriting)
const base=u.origin+"/functions/v1/tracking-app";
if(p.startsWith("/tracking-app"))p=p.slice("/tracking-app".length)||"/";
if(p===""||p==="/")p="/";
// Redirect /coach -> /coach/ for proper relative CSS loading
if(p==="/coach"||p==="/admin")return new Response(null,{status:301,headers:{...H,"Location":base+"/coach/"}});
if(p==="/forge.css")return new Response(F,{headers:{...H,"Content-Type":"text/css"}});
if(p==="/"||p==="/student"||p==="/app")return new Response(S,{headers:{...H,"Content-Type":"text/html"}});
if(p==="/coach/"||p==="/admin/")return new Response(C,{headers:{...H,"Content-Type":"text/html"}});
if(p==="/api/coach/students"&&m==="GET"){const{data:s}=await sb.from("students").select("*").order("joined_at",{ascending:false});const td=new Date().toISOString().slice(0,10);const{data:e}=await sb.from("daily_entries").select("*").eq("entry_date",td);const em:Record<string,any>={};(e||[]).forEach((x:any)=>{em[x.student_id]=x});return Response.json((s||[]).map((x:any)=>({...x,has_filled:!!em[x.id],today_entry:em[x.id]||null})),{headers:H})}
if(p==="/api/coach/stats"&&m==="GET"){const{count:t}=await sb.from("students").select("*",{count:"exact",head:true});const td=new Date().toISOString().slice(0,10);const{count:f}=await sb.from("daily_entries").select("*",{count:"exact",head:true}).eq("entry_date",td);const{data:cd}=await sb.from("daily_entries").select("ca_eur").eq("entry_date",td);const ca=(cd||[]).reduce((s:number,x:any)=>s+(x.ca_eur||0),0);return Response.json({total:t||0,filled:f||0,missing:(t||0)-(f||0),ca_total:Math.round(ca*100)/100},{headers:H})}
const dm=p.match(/^\/api\/coach\/students\/([a-f0-9-]+)$/);if(dm&&m==="GET"){const{data:s}=await sb.from("students").select("*").eq("id",dm[1]).single();const{data:e}=await sb.from("daily_entries").select("*").eq("student_id",dm[1]).order("entry_date",{ascending:false}).limit(30);const{data:a}=await sb.from("entry_audit").select("*").eq("student_id",dm[1]).order("performed_at",{ascending:false}).limit(50);return Response.json({student:s,entries:e||[],audit:a||[]},{headers:H})}
if(p==="/api/auth"&&m==="POST"){const{email,firstName,lastName}=await req.json();if(!email||!firstName||!lastName)return Response.json({error:"Email, prenom et nom requis"},{status:400,headers:H});const s=await fc(email,firstName,lastName);return Response.json({token:gt(s.id),student:s},{headers:H})}
const ah=req.headers.get("Authorization");let sid:string|null=null;if(ah?.startsWith("Bearer "))sid=vt(ah.slice(7));
if(p.startsWith("/api/")&&!p.startsWith("/api/coach/")){if(!sid)return Response.json({error:"Non autorise"},{status:401,headers:H});
if(p==="/api/me/today"&&m==="GET"){const td=new Date().toISOString().slice(0,10);const{data:d}=await sb.from("daily_entries").select("*").eq("student_id",sid).eq("entry_date",td).maybeSingle();if(d)return Response.json(d,{headers:H});const{data:r}=await sb.from("daily_entries").insert({student_id:sid,entry_date:td,calls:0,dm:0,videos:0,live:false,ca_eur:0}).select().single();return Response.json(r,{headers:H})}
if(p==="/api/me/history"&&m==="GET"){const{data:d}=await sb.from("daily_entries").select("*").eq("student_id",sid).order("entry_date",{ascending:false}).limit(30);return Response.json(d||[],{headers:H})}
const em=p.match(/^\/api\/me\/entries\/(\d{4}-\d{2}-\d{2})$/);if(em&&m==="PUT"){const ed=em[1];const tda=new Date();tda.setDate(tda.getDate()-3);if(new Date(ed)<new Date(tda.toISOString().slice(0,10)))return Response.json({error:"3 jours max"},{status:400,headers:H});const b=await req.json();const{data:d}=await sb.from("daily_entries").upsert({student_id:sid,entry_date:ed,calls:b.calls||0,dm:b.dm||0,videos:b.videos||0,live:b.live||false,ca_eur:b.ca_eur||0},{onConflict:"student_id, entry_date"}).select().single();return Response.json(d,{headers:H})}}
return new Response("Not Found",{status:404,headers:H});}
serve(hr);
