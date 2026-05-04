#!/usr/bin/env python3
"""
Djibril Tracking — Serveur Local (design Claude Design)
Sert la Edge Function Supabase en local avec SQLite
Design: Forge (off-white) + Cosmos (capsules) — identique au prototype Claude Design
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import sqlite3, json, hashlib, secrets, os
from datetime import datetime, timedelta
from contextlib import contextmanager
import uvicorn

BASE = Path(__file__).parent
DB_PATH = BASE / "tracking.db"
PORT = int(os.environ.get("PORT", 8765))
TOKEN_SECRET = os.environ.get("TOKEN_SECRET", "djibril-tracking-secret-2026")

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
            CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                full_name TEXT DEFAULT '',
                color TEXT DEFAULT 'ember',
                joined_at TEXT DEFAULT (datetime('now')),
                is_coach INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS daily_entries (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL REFERENCES students(id),
                entry_date TEXT NOT NULL,
                calls INTEGER DEFAULT 0,
                dm INTEGER DEFAULT 0,
                videos INTEGER DEFAULT 0,
                live INTEGER DEFAULT 0,
                ca_eur REAL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(student_id, entry_date)
            );
            CREATE TABLE IF NOT EXISTS entry_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                entry_date TEXT NOT NULL,
                action TEXT NOT NULL,
                before_json TEXT,
                after_json TEXT,
                performed_at TEXT DEFAULT (datetime('now'))
            );
            INSERT OR IGNORE INTO students (id, email, first_name, full_name, is_coach)
            VALUES ('coach-001', 'coach@djibril.com', 'Coach', 'Djibril', 1);
        """)
        
# ─── Auth ─────────────────────────────────────────────────
def generate_token(student_id: str) -> str:
    payload = secrets.token_hex(16)
    sig = hashlib.sha256(f"{payload}:{TOKEN_SECRET}:{student_id}".encode()).hexdigest()[:32]
    return f"{student_id}:{payload}:{sig}"

def verify_token(token: str):
    """Return student_id or None"""
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return None
        sid, payload, sig = parts
        expected = hashlib.sha256(f"{payload}:{TOKEN_SECRET}:{sid}".encode()).hexdigest()[:32]
        if sig != expected:
            return None
        return sid
    except:
        return None

# ─── CSS forge ────────────────────────────────────────────
FORGE_CSS = (BASE / "supabase" / "functions" / "tracking-app" / "forge.css").read_text()

# ─── HTML pages (de la Edge Function Supabase) ────────────
FUNCTION_CODE = (BASE / "supabase" / "functions" / "tracking-app" / "index.ts").read_text()

def extract_html(html_fn_name: str) -> str:
    """Extrait le HTML d'une fonction de la Edge Function"""
    import re
    pattern = rf"function {html_fn_name}\(\): string {{\s*return `(.*?)`;"
    match = re.search(pattern, FUNCTION_CODE, re.DOTALL)
    if match:
        html = match.group(1)
        # Remplacer les références à /forge.css par le CSS inline
        html = html.replace('<link rel="stylesheet" href="/forge.css">', f'<style>{FORGE_CSS}</style>')
        # Remplacer l'API endpoint
        html = html.replace("const API = window.location.origin + '/api'", "const API = window.location.origin + '/api'")
        return html
    return "<h1>Erreur: page non trouvée</h1>"

# ─── Routes API ───────────────────────────────────────────
@app.get("/api/coach/students")
async def coach_students():
    with get_db() as db:
        rows = db.execute("SELECT * FROM students ORDER BY joined_at DESC").fetchall()
        today = datetime.now().strftime("%Y-%m-%d")
        students = []
        for r in rows:
            entry = db.execute("SELECT * FROM daily_entries WHERE student_id=? AND entry_date=?", (r["id"], today)).fetchone()
            students.append({
                "id": r["id"], "email": r["email"], "first_name": r["first_name"],
                "full_name": r["full_name"], "joined_at": r["joined_at"],
                "has_filled": entry is not None
            })
        return JSONResponse(students)

@app.get("/api/coach/stats")
async def coach_stats():
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) FROM students").fetchone()[0]
        today = datetime.now().strftime("%Y-%m-%d")
        filled = db.execute("SELECT COUNT(*) FROM daily_entries WHERE entry_date=?", (today,)).fetchone()[0]
        return {"total": total, "filled": filled, "missing": total - filled}

@app.get("/api/coach/students/{sid}")
async def coach_student_detail(sid: str):
    with get_db() as db:
        student = db.execute("SELECT * FROM students WHERE id=?", (sid,)).fetchone()
        if not student:
            raise HTTPException(404)
        entries = db.execute("SELECT * FROM daily_entries WHERE student_id=? ORDER BY entry_date DESC LIMIT 30", (sid,)).fetchall()
        audit = db.execute("SELECT * FROM entry_audit WHERE student_id=? ORDER BY performed_at DESC LIMIT 50", (sid,)).fetchall()
        return {
            "student": dict(student),
            "entries": [dict(e) for e in entries],
            "audit": [dict(a) for a in audit]
        }

@app.post("/api/auth")
async def auth(request: Request):
    body = await request.json()
    email = body.get("email", "").lower().strip()
    first_name = body.get("firstName", "").strip()
    last_name = body.get("lastName", "").strip()
    if not email or not first_name or not last_name:
        raise HTTPException(400, "Email, prénom et nom requis")
    
    with get_db() as db:
        student = db.execute("SELECT * FROM students WHERE email=?", (email,)).fetchone()
        if student:
            student = dict(student)
        else:
            sid = secrets.token_hex(12)
            db.execute("INSERT INTO students (id, email, first_name, full_name) VALUES (?, ?, ?, ?)",
                       (sid, email, first_name, last_name))
            student = {"id": sid, "email": email, "first_name": first_name, "full_name": last_name}
        
        token = generate_token(student["id"])
        return {"token": token, "student": student}

@app.get("/api/me/today")
async def me_today(request: Request):
    auth = request.headers.get("Authorization", "")
    sid = verify_token(auth.replace("Bearer ", ""))
    if not sid:
        raise HTTPException(401, "Non autorisé")
    
    today = datetime.now().strftime("%Y-%m-%d")
    with get_db() as db:
        entry = db.execute("SELECT * FROM daily_entries WHERE student_id=? AND entry_date=?", (sid, today)).fetchone()
        if entry:
            return dict(entry)
        entry_id = secrets.token_hex(12)
        db.execute("INSERT OR IGNORE INTO daily_entries (id, student_id, entry_date) VALUES (?, ?, ?)",
                   (entry_id, sid, today))
        entry = db.execute("SELECT * FROM daily_entries WHERE student_id=? AND entry_date=?", (sid, today)).fetchone()
        return dict(entry)

@app.put("/api/me/entries/{entry_date}")
async def save_entry(entry_date: str, request: Request):
    auth = request.headers.get("Authorization", "")
    sid = verify_token(auth.replace("Bearer ", ""))
    if not sid:
        raise HTTPException(401, "Non autorisé")
    
    # Lockout J-3
    three_days_ago = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
    if entry_date < three_days_ago:
        raise HTTPException(400, "Tu ne peux modifier que les 3 derniers jours")
    
    body = await request.json()
    with get_db() as db:
        old = db.execute("SELECT * FROM daily_entries WHERE student_id=? AND entry_date=?", (sid, entry_date)).fetchone()
        old_json = json.dumps(dict(old)) if old else None
        
        entry_id = secrets.token_hex(12)
        db.execute("""
            INSERT INTO daily_entries (id, student_id, entry_date, calls, dm, videos, live, ca_eur)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(student_id, entry_date) DO UPDATE SET
                calls=excluded.calls, dm=excluded.dm, videos=excluded.videos,
                live=excluded.live, ca_eur=excluded.ca_eur, updated_at=datetime('now')
        """, (entry_id, sid, entry_date, body.get("calls", 0), body.get("dm", 0),
              body.get("videos", 0), body.get("live", False), body.get("ca_eur", 0)))
        
        new = db.execute("SELECT * FROM daily_entries WHERE student_id=? AND entry_date=?", (sid, entry_date)).fetchone()
        db.execute("INSERT INTO entry_audit (student_id, entry_date, action, before_json, after_json) VALUES (?, ?, 'UPDATE', ?, ?)",
                   (sid, entry_date, old_json, json.dumps(dict(new))))
        
        return dict(new)


# ─── LLM Logs endpoint ─────────────────────────────────────
LOG_DIR = BASE / "logs"
LOG_DIR.mkdir(exist_ok=True)
LLM_CALLS_FILE = LOG_DIR / "hermes_llm_calls.jsonl"

@app.post("/api/llm/log")
async def llm_log(request: Request):
    """Endpoint pour hermes_call.sh → log structuré dans le fichier JSONL"""
    body = await request.json()
    ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    entry = {
        "ts": ts,
        "agent": body.get("agent", "hermes"),
        "model": body.get("model", "unknown"),
        "tier": body.get("tier", 3),
        "tokens_in": body.get("tokens_in", 0),
        "tokens_out": body.get("tokens_out", 0),
        "cost_usd": body.get("cost_usd", 0.0),
        "task_type": body.get("task_type", ""),
        "result_summary": body.get("result_summary", ""),
    }
    with open(str(LLM_CALLS_FILE), "a") as f:
        f.write(json.dumps(entry) + "\n")
    return {"status": "logged"}


# ─── Pages ────────────────────────────────────────────────
@app.get("/")
@app.get("/app")
@app.get("/student")
async def student_page():
    return HTMLResponse(extract_html("studentHtml"))

@app.get("/coach")
@app.get("/admin")
async def coach_page():
    return HTMLResponse(extract_html("coachHtml"))

@app.get("/forge.css")
async def forge_css():
    return HTMLResponse(content=FORGE_CSS, media_type="text/css")

# ─── Start ────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print(f"🚀 Tracking Djibril — http://localhost:{PORT}")
    print(f"   Élève: http://localhost:{PORT}/app")
    print(f"   Coach: http://localhost:{PORT}/coach")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
