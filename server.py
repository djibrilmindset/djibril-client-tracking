#!/usr/bin/env python3
"""
Djibril Tracking — Client Portal + Admin Dashboard
FastAPI + SQLite + Linear dark design
Auth: email + first_name + last_name (no password)
First connexion = register, subsequent = lookup
Admin: /admin (no security, as requested)
"""

import sqlite3, hashlib, secrets, json, time, os
from datetime import datetime, timedelta
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Form, Cookie, Response, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# ─── Config ───────────────────────────────────────────────
DB_PATH = Path(__file__).parent / "tracking.db"
PORT = int(os.environ.get("PORT", 8765))
SESSION_DURATION_DAYS = 30

app = FastAPI(title="Djibril Tracking")

# ─── Database ─────────────────────────────────────────────
@contextmanager
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_db():
    with get_db() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                last_login TEXT DEFAULT (datetime('now')),
                login_count INTEGER DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(id)
            );
            CREATE TABLE IF NOT EXISTS tracking_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                metadata TEXT DEFAULT '{}',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (client_id) REFERENCES clients(id)
            );
            CREATE INDEX IF NOT EXISTS idx_events_client ON tracking_events(client_id);
            CREATE INDEX IF NOT EXISTS idx_events_type ON tracking_events(event_type);
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        """)

init_db()

# ─── Auth Helpers ─────────────────────────────────────────
def get_client_by_session(token: str):
    with get_db() as db:
        row = db.execute("""
            SELECT c.* FROM clients c
            JOIN sessions s ON s.client_id = c.id
            WHERE s.token = ? AND s.expires_at > datetime('now')
        """, (token,)).fetchone()
    return dict(row) if row else None

def get_all_clients():
    with get_db() as db:
        rows = db.execute("SELECT * FROM clients ORDER BY last_login DESC").fetchall()
    return [dict(r) for r in rows]

def get_client_events(client_id: int, limit=100):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM tracking_events WHERE client_id=? ORDER BY created_at DESC LIMIT ?",
            (client_id, limit)
        ).fetchall()
    return [dict(r) for r in rows]

def get_all_events(limit=200):
    with get_db() as db:
        rows = db.execute("""
            SELECT e.*, c.first_name, c.last_name, c.email
            FROM tracking_events e
            JOIN clients c ON c.id = e.client_id
            ORDER BY e.created_at DESC LIMIT ?
        """, (limit,)).fetchall()
    return [dict(r) for r in rows]

def get_stats():
    with get_db() as db:
        total_clients = db.execute("SELECT COUNT(*) as n FROM clients").fetchone()["n"]
        total_events = db.execute("SELECT COUNT(*) as n FROM tracking_events").fetchone()["n"]
        today = datetime.now().strftime("%Y-%m-%d")
        today_logins = db.execute(
            "SELECT COUNT(*) as n FROM clients WHERE date(last_login)=?", (today,)
        ).fetchone()["n"]
        event_types = db.execute(
            "SELECT event_type, COUNT(*) as n FROM tracking_events GROUP BY event_type ORDER BY n DESC"
        ).fetchall()
    return {
        "total_clients": total_clients,
        "total_events": total_events,
        "today_logins": today_logins,
        "event_types": [dict(r) for r in event_types]
    }

# ─── CSS (Linear-inspired dark) ───────────────────────────
CSS = """
:root {
  --bg: #08090a; --panel: #0f1011; --surface: #191a1b;
  --text: #f7f8f8; --text2: #d0d6e0; --text3: #8a8f98; --text4: #62666d;
  --accent: #5e6ad2; --accent-hover: #828fff; --green: #27a644;
  --border: rgba(255,255,255,0.08); --border-sub: rgba(255,255,255,0.05);
  --radius: 8px; --radius-sm: 6px; --radius-lg: 12px;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg); color: var(--text2); min-height: 100vh;
  line-height: 1.5; font-size: 15px;
  font-feature-settings: 'cv01','ss03';
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent-hover); text-decoration: none; }
a:hover { color: #a5a8ff; }
input, button { font-family: inherit; font-feature-settings: inherit; }

/* layout */
.container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
header {
  background: var(--panel); border-bottom: 1px solid var(--border);
  padding: 16px 0; position: sticky; top: 0; z-index: 10;
}
header .container { display: flex; justify-content: space-between; align-items: center; }
.logo { font-size: 18px; font-weight: 510; color: var(--text); letter-spacing: -0.24px; }
.logo span { color: var(--accent-hover); }
nav { display: flex; gap: 20px; align-items: center; font-size: 14px; }
nav a { color: var(--text2); transition: color .15s; }
nav a:hover { color: var(--text); }
.btn-logout { color: var(--text4) !important; font-weight: 400; }
.user-badge {
  background: rgba(255,255,255,0.04); border: 1px solid var(--border);
  border-radius: 999px; padding: 4px 14px; font-size: 13px; color: var(--text2);
  font-weight: 510;
}
/* cards */
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 24px;
}
.card-sm {
  background: rgba(255,255,255,0.02); border: 1px solid var(--border-sub);
  border-radius: var(--radius); padding: 16px;
}
.stat-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 20px 24px; text-align: center;
}
.stat-num { font-size: 32px; font-weight: 590; color: var(--text); letter-spacing: -0.7px; }
.stat-label { font-size: 13px; color: var(--text3); margin-top: 4px; font-weight: 510; }
/* grid */
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
/* forms */
.form-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 32px; max-width: 420px;
  margin: 80px auto; text-align: center;
}
.form-card h1 { font-size: 24px; font-weight: 510; color: var(--text); letter-spacing: -0.3px; margin-bottom: 8px; }
.form-card p { color: var(--text3); font-size: 14px; margin-bottom: 24px; }
.input-group { margin-bottom: 16px; text-align: left; }
.input-group label { display: block; font-size: 12px; font-weight: 510; color: var(--text3); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.input-group input {
  width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.02);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  color: var(--text); font-size: 15px; transition: border-color .15s;
  outline: none;
}
.input-group input:focus { border-color: var(--accent); }
.input-group input::placeholder { color: var(--text4); }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 20px; border-radius: var(--radius-sm); font-size: 14px;
  font-weight: 510; border: none; cursor: pointer; transition: all .15s;
  text-decoration: none;
}
.btn-primary { background: var(--accent); color: #fff; width: 100%; }
.btn-primary:hover { background: var(--accent-hover); }
.btn-ghost {
  background: rgba(255,255,255,0.03); color: var(--text2);
  border: 1px solid var(--border);
}
.btn-ghost:hover { background: rgba(255,255,255,0.06); color: var(--text); }
.btn-sm { padding: 6px 14px; font-size: 13px; }
/* tables */
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left; padding: 10px 14px; color: var(--text3);
  font-weight: 510; font-size: 12px; text-transform: uppercase;
  letter-spacing: 0.05em; border-bottom: 1px solid var(--border);
}
td {
  padding: 10px 14px; border-bottom: 1px solid var(--border-sub);
  color: var(--text2); font-weight: 400;
}
tr:hover td { background: rgba(255,255,255,0.01); }
/* badges */
.badge {
  display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 510;
}
.badge-green { background: rgba(39,166,68,0.15); color: var(--green); }
.badge-accent { background: rgba(94,106,210,0.15); color: var(--accent-hover); }
.badge-neutral { background: rgba(255,255,255,0.05); color: var(--text3); }
/* events timeline */
.event-row {
  display: flex; align-items: center; gap: 14px; padding: 10px 0;
  border-bottom: 1px solid var(--border-sub);
}
.event-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--accent);
  flex-shrink: 0;
}
.event-time { font-size: 12px; color: var(--text4); min-width: 150px; font-weight: 400; }
.event-type { font-size: 13px; color: var(--accent-hover); font-weight: 510; min-width: 100px; }
.event-meta { font-size: 13px; color: var(--text3); flex: 1; word-break: break-all; }
/* sections */
.section { padding: 40px 0; }
.section-title { font-size: 20px; font-weight: 590; color: var(--text); letter-spacing: -0.24px; margin-bottom: 20px; }
.empty-state {
  text-align: center; padding: 48px; color: var(--text4); font-size: 14px;
}
/* hero */
.hero { padding: 80px 0 60px; text-align: center; }
.hero h1 { font-size: 48px; font-weight: 510; color: var(--text); letter-spacing: -1.05px; line-height: 1.1; }
.hero p { font-size: 18px; color: var(--text3); margin-top: 12px; letter-spacing: -0.16px; }
/* responsive */
@media (max-width: 768px) {
  .grid-3,.grid-4 { grid-template-columns: 1fr; }
  .hero h1 { font-size: 32px; letter-spacing: -0.7px; }
  .container { padding: 0 16px; }
}
"""

# ─── HTML Templates ───────────────────────────────────────
def base_page(title: str, content: str, user=None) -> str:
    nav = f"""<header><div class="container">
        <a href="/dashboard" class="logo">Djibril<span>Tracking</span></a>
        <nav>
            <span class="user-badge">{user['first_name']} {user['last_name']}</span>
            <a href="/dashboard">Dashboard</a>
            <a href="/logout" class="btn-logout">Déconnexion</a>
        </nav>
    </div></header>""" if user else ""

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — Djibril Tracking</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;510;590&display=swap" rel="stylesheet">
    <style>{CSS}</style>
</head>
<body>
{nav}
{content}
</body>
</html>"""

def flash(msg: str, kind="success") -> str:
    colors = {"success": "var(--green)", "error": "#e5484d", "info": "var(--accent-hover)"}
    c = colors.get(kind, colors["info"])
    return f"""<div style="background:{c}15;color:{c};border:1px solid {c}30;border-radius:var(--radius-sm);padding:10px 16px;margin-bottom:16px;font-size:14px;font-weight:510;">{msg}</div>"""

# ─── Routes ───────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    content = """<div class="form-card">
        <h1>Djibril Tracking</h1>
        <p>Connecte-toi avec ton email et ton nom</p>
        <form method="post" action="/login">
            <div class="input-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="ton@email.com" required>
            </div>
            <div class="input-group">
                <label>Prénom</label>
                <input type="text" name="first_name" placeholder="Jean" required>
            </div>
            <div class="input-group">
                <label>Nom</label>
                <input type="text" name="last_name" placeholder="Dupont" required>
            </div>
            <button type="submit" class="btn btn-primary">Accéder à mon espace →</button>
        </form>
        <p style="margin-top:16px;font-size:12px;color:var(--text4);">Première connexion ? Ton compte sera créé automatiquement.</p>
    </div>"""
    return HTMLResponse(base_page("Connexion", content))

@app.post("/login", response_class=HTMLResponse)
async def login(request: Request, email: str = Form(...), first_name: str = Form(...), last_name: str = Form(...)):
    email = email.strip().lower()
    first_name = first_name.strip()
    last_name = last_name.strip()

    if not email or not first_name or not last_name:
        content = """<div class="form-card">""" + flash("Tous les champs sont requis.", "error") + """<h1>Djibril Tracking</h1>
        <form method="post" action="/login">
            <div class="input-group"><label>Email</label><input type="email" name="email" required></div>
            <div class="input-group"><label>Prénom</label><input type="text" name="first_name" required></div>
            <div class="input-group"><label>Nom</label><input type="text" name="last_name" required></div>
            <button type="submit" class="btn btn-primary">Accéder →</button>
        </form></div>"""
        return HTMLResponse(base_page("Connexion", content))

    with get_db() as db:
        client = db.execute("SELECT * FROM clients WHERE email=?", (email,)).fetchone()

        if client:
            # Return visit — verify name matches roughly
            c = dict(client)
            if c["first_name"].lower() != first_name.lower() or c["last_name"].lower() != last_name.lower():
                content = """<div class="form-card">""" + flash("Le nom ne correspond pas à l'email. Vérifie ou contacte ton coach.", "error") + """<h1>Djibril Tracking</h1>
                <form method="post" action="/login">
                    <div class="input-group"><label>Email</label><input type="email" name="email" required></div>
                    <div class="input-group"><label>Prénom</label><input type="text" name="first_name" required></div>
                    <div class="input-group"><label>Nom</label><input type="text" name="last_name" required></div>
                    <button type="submit" class="btn btn-primary">Accéder →</button>
                </form></div>"""
                return HTMLResponse(base_page("Connexion", content))

            db.execute("UPDATE clients SET last_login=datetime('now'), login_count=login_count+1 WHERE id=?", (c["id"],))
            client_id = c["id"]
        else:
            # First connexion — register
            cur = db.execute(
                "INSERT INTO clients (email, first_name, last_name) VALUES (?, ?, ?)",
                (email, first_name, last_name)
            )
            client_id = cur.lastrowid
            db.execute(
                "INSERT INTO tracking_events (client_id, event_type, metadata) VALUES (?, 'first_login', ?)",
                (client_id, json.dumps({"first_name": first_name, "last_name": last_name}))
            )
            # Log client creation for admin
            db.execute(
                "INSERT INTO tracking_events (client_id, event_type, metadata) VALUES (?, 'account_created', '{}')",
                (client_id,)
            )

        # Create session
        token = secrets.token_urlsafe(32)
        expires = (datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
        db.execute(
            "INSERT INTO sessions (client_id, token, expires_at) VALUES (?, ?, ?)",
            (client_id, token, expires)
        )
        db.execute(
            "INSERT INTO tracking_events (client_id, event_type, metadata) VALUES (?, 'login', '{}')",
            (client_id,)
        )

    resp = RedirectResponse(url="/dashboard", status_code=303)
    resp.set_cookie(key="session", value=token, max_age=SESSION_DURATION_DAYS * 86400, httponly=True, samesite="lax")
    return resp

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    token = request.cookies.get("session")
    user = get_client_by_session(token) if token else None
    if not user:
        return RedirectResponse(url="/login")

    events = get_client_events(user["id"], 50)
    total_events = len(events)
    event_types = {}
    for e in events:
        t = e["event_type"]
        event_types[t] = event_types.get(t, 0) + 1

    first_login = next((e for e in events if e["event_type"] == "first_login"), None)
    account_created = next((e for e in events if e["event_type"] == "account_created"), None)
    member_since = account_created["created_at"] if account_created else (first_login["created_at"] if first_login else user["created_at"])

    events_html = ""
    if events:
        for e in events[:30]:
            meta_str = e["metadata"]
            try:
                meta = json.loads(meta_str)
                meta_display = ", ".join(f"{k}: {v}" for k, v in meta.items()) if isinstance(meta, dict) and meta else ""
            except:
                meta_display = meta_str if meta_str != "{}" else ""
            events_html += f"""<div class="event-row">
                <div class="event-dot"></div>
                <div class="event-time">{e['created_at']}</div>
                <div class="event-type"><span class="badge badge-accent">{e['event_type']}</span></div>
                <div class="event-meta">{meta_display}</div>
            </div>"""
    else:
        events_html = """<div class="empty-state">Aucun événement pour le moment.</div>"""

    stats_html = f"""
        <div class="stat-card"><div class="stat-num">{total_events}</div><div class="stat-label">Événements</div></div>
        <div class="stat-card"><div class="stat-num">{len(event_types)}</div><div class="stat-label">Types</div></div>
        <div class="stat-card"><div class="stat-num">{user['login_count']}</div><div class="stat-label">Connexions</div></div>
        <div class="stat-card"><div class="stat-num" style="font-size:14px;">{member_since[:10] if member_since else '—'}</div><div class="stat-label">Membre depuis</div></div>
    """

    content = f"""<main class="container">
        <div class="hero" style="padding:40px 0 30px;">
            <h1 style="font-size:32px;letter-spacing:-0.7px;">Salut {user['first_name']} 👋</h1>
            <p>Voici ton espace de suivi</p>
        </div>

        <div class="grid-4" style="margin-bottom:40px;">{stats_html}</div>

        <div class="section">
            <h2 class="section-title">📋 Historique récent</h2>
            <div class="card">{events_html}</div>
        </div>
    </main>"""
    return HTMLResponse(base_page("Dashboard", content, user))

# ─── Admin (no auth, as requested) ────────────────────────
@app.get("/admin", response_class=HTMLResponse)
async def admin_panel(request: Request):
    stats = get_stats()
    clients = get_all_clients()
    events = get_all_events(100)

    clients_rows = ""
    for c in clients:
        clients_rows += f"""<tr>
            <td>{c['id']}</td>
            <td style="color:var(--text);font-weight:510;">{c['first_name']} {c['last_name']}</td>
            <td>{c['email']}</td>
            <td>{c['last_login']}</td>
            <td>{c['created_at']}</td>
            <td><span class="badge badge-neutral">{c['login_count']}</span></td>
            <td><a href="/admin/client/{c['id']}" style="font-size:12px;">Voir →</a></td>
        </tr>"""

    events_rows = ""
    for e in events:
        try:
            meta = json.loads(e["metadata"])
            meta_display = ", ".join(f"{k}: {v}" for k, v in meta.items())[:80] if isinstance(meta, dict) and meta else ""
        except:
            meta_display = str(e["metadata"])[:80]
        events_rows += f"""<tr>
            <td><span class="badge badge-accent">{e['event_type']}</span></td>
            <td>{e['first_name']} {e['last_name']}</td>
            <td style="font-size:12px;">{e['email']}</td>
            <td style="font-size:12px;">{e['created_at']}</td>
            <td style="font-size:12px;color:var(--text4);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{meta_display}</td>
        </tr>"""

    event_type_rows = ""
    for et in stats["event_types"]:
        event_type_rows += f"""<tr><td><span class="badge badge-accent">{et['event_type']}</span></td><td>{et['n']}</td></tr>"""

    content = f"""<main class="container">
        <div class="hero" style="padding:30px 0 20px;">
            <h1 style="font-size:32px;letter-spacing:-0.7px;">Admin Panel</h1>
            <p style="font-size:14px;color:var(--text4);">⚠️ Sans authentification — panel privé, ne pas partager le lien</p>
        </div>

        <div class="grid-4" style="margin-bottom:40px;">
            <div class="stat-card"><div class="stat-num">{stats['total_clients']}</div><div class="stat-label">Clients</div></div>
            <div class="stat-card"><div class="stat-num">{stats['total_events']}</div><div class="stat-label">Événements totaux</div></div>
            <div class="stat-card"><div class="stat-num">{stats['today_logins']}</div><div class="stat-label">Aujourd'hui</div></div>
            <div class="stat-card"><div class="stat-num">{len(stats['event_types'])}</div><div class="stat-label">Types d'événements</div></div>
        </div>

        <div class="section">
            <h2 class="section-title">👥 Clients ({stats['total_clients']})</h2>
            <div class="card" style="overflow-x:auto;padding:0;">
                <table>
                    <thead><tr><th>ID</th><th>Nom</th><th>Email</th><th>Dernier login</th><th>Créé le</th><th>Logins</th><th></th></tr></thead>
                    <tbody>{clients_rows}</tbody>
                </table>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">📊 Événements récents</h2>
            <div class="card" style="overflow-x:auto;padding:0;">
                <table>
                    <thead><tr><th>Type</th><th>Client</th><th>Email</th><th>Date</th><th>Détails</th></tr></thead>
                    <tbody>{events_rows}</tbody>
                </table>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">📈 Répartition par type</h2>
            <div class="card" style="overflow-x:auto;padding:0;">
                <table>
                    <thead><tr><th>Type d'événement</th><th>Total</th></tr></thead>
                    <tbody>{event_type_rows}</tbody>
                </table>
            </div>
        </div>
    </main>"""
    return HTMLResponse(base_page("Admin", content))

@app.get("/admin/client/{client_id}", response_class=HTMLResponse)
async def admin_client_detail(client_id: int):
    with get_db() as db:
        client = db.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
        if not client:
            raise HTTPException(404)
        c = dict(client)
        events = db.execute(
            "SELECT * FROM tracking_events WHERE client_id=? ORDER BY created_at DESC LIMIT 100",
            (client_id,)
        ).fetchall()
        events_list = [dict(e) for e in events]

    events_rows = ""
    for e in events_list:
        try:
            meta = json.loads(e["metadata"])
            meta_display = json.dumps(meta, indent=2, ensure_ascii=False) if isinstance(meta, dict) and meta else ""
        except:
            meta_display = e["metadata"]
        events_rows += f"""<div class="event-row">
            <div class="event-dot"></div>
            <div class="event-time">{e['created_at']}</div>
            <div class="event-type"><span class="badge badge-accent">{e['event_type']}</span></div>
            <div class="event-meta" style="font-size:11px;"><pre style="font-family: 'JetBrains Mono', monospace; font-size:11px; color: var(--text4); white-space: pre-wrap;">{meta_display}</pre></div>
        </div>"""

    content = f"""<main class="container">
        <div style="padding:30px 0 20px;">
            <a href="/admin" style="font-size:13px;color:var(--text4);">← Retour Admin</a>
        </div>
        <div class="hero" style="padding:0 0 20px;text-align:left;">
            <h1 style="font-size:28px;letter-spacing:-0.5px;">{c['first_name']} {c['last_name']}</h1>
            <p style="font-size:14px;">{c['email']} · Créé {c['created_at']} · {c['login_count']} connexions</p>
        </div>
        <div class="section">
            <h2 class="section-title">📋 Historique ({len(events_list)} événements)</h2>
            <div class="card">{events_rows if events_rows else '<div class="empty-state">Aucun événement.</div>'}</div>
        </div>
    </main>"""
    return HTMLResponse(base_page(f"Client {c['first_name']}", content))

# ─── API: record tracking event ───────────────────────────
@app.post("/api/event")
async def record_event(request: Request):
    """Record a tracking event. Can use session cookie or client_id param."""
    token = request.cookies.get("session")
    data = await request.json()
    client_id = data.get("client_id")
    event_type = data.get("event_type", "custom_event")
    metadata = data.get("metadata", {})

    if not client_id:
        user = get_client_by_session(token) if token else None
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        client_id = user["id"]

    with get_db() as db:
        db.execute(
            "INSERT INTO tracking_events (client_id, event_type, metadata) VALUES (?, ?, ?)",
            (client_id, event_type, json.dumps(metadata) if isinstance(metadata, dict) else metadata)
        )
    return JSONResponse({"status": "ok", "client_id": client_id, "event_type": event_type})

@app.get("/api/events/{client_id}")
async def get_events(client_id: int, limit: int = 50):
    events = get_client_events(client_id, limit)
    return JSONResponse(events)

@app.get("/logout")
async def logout():
    resp = RedirectResponse(url="/login")
    resp.delete_cookie("session")
    return resp

# ─── Health ───────────────────────────────────────────────
@app.get("/health")
async def health():
    stats = get_stats()
    return JSONResponse({"status": "ok", "clients": stats["total_clients"], "events": stats["total_events"]})

if __name__ == "__main__":
    print(f"\n  🔍 Djibril Tracking → http://localhost:{PORT}")
    print(f"  🔧 Admin Panel    → http://localhost:{PORT}/admin")
    print(f"  📊 Health Check   → http://localhost:{PORT}/health\n")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
