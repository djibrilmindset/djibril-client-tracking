# 🎯 HANDOFF — Tracking Djibril → Claude Code

## Contexte
Deux apps (Élève + Coach) pour tracker l'effort quotidien des élèves.
DB Supabase déjà en place. API Edge Function déjà déployée.
Prototypes visuels Claude Design déjà sur GitHub Pages.

## Ce qui est FAIT ✅

### Base de données (Supabase PostgreSQL)
- `students` : id, email, first_name, full_name, color, joined_at, is_coach
- `daily_entries` : student_id, entry_date, calls, dm, videos, live, ca_eur
- `entry_audit` : log immuable des modifications
- DB déjà peuplée avec 4 élèves de test

### API (Edge Function Supabase)
URL : `https://nbnbsljqtolzzuqnkyae.supabase.co/functions/v1/tracking-app`

Endpoints :
- `POST /api/auth` → `{email, firstName}` → `{token, student}` (crée si nouveau)
- `GET /api/me/today` → fiche du jour (auto-créée si absente)
- `PUT /api/me/entries/:date` → sauvegarde (lockout J-3)
- `GET /api/coach/students` → liste élèves + statut jour
- `GET /api/coach/stats` → total/remplis/manquants
- `GET /api/coach/students/:id` → détail + 30j + audit

Auth : token signé (Bearer), pas de mot de passe, session 30j.
Coach API : ouverte (pas d'auth).

### Prototypes visuels (GitHub Pages)
- Élève : https://djibrilmindset.github.io/djibril-student-app/
- Coach : https://djibrilmindset.github.io/djibril-coach-app/
- Design : cosmos (capsules rares), forge (off-white #f3ecdf, ember #e85d2c)
- Les prototypes utilisent localStorage (données demo)

### Sources du design
Dossier : `/Users/pardin/tracking djibril /tracking-export/`
- `tokens.css` — Design tokens Forge
- `cosmos-rich.css` — Effets visuels (capsules, bruit, lignes)
- `app.css` — Layout app
- `admin.css` — Layout coach
- `Tracking Djibril (Client).html` — Proto app élève
- `Admin Coach (1).html` — Proto app coach
- `shell.jsx`, `views2.jsx`, `admin.jsx` — Composants React

## Ce qu'il reste à faire 🔨

Transformer les prototypes (localStorage → Supabase) :

1. **Remplacer le WhoAmI/login par l'appel API** :
   ```
   POST /api/auth {email, firstName} → token
   Stocker token dans localStorage
   ```

2. **Brancher MaFiche2 sur l'API** :
   ```
   GET /api/me/today → données du jour
   PUT /api/me/entries/:date → sauvegarde
   ```

3. **Brancher l'écran Coach sur l'API** :
   ```
   GET /api/coach/students → liste
   GET /api/coach/students/:id → détail + audit
   ```

4. **Garder le design intact** — cosmos, capsules, dock, mots forge

## Stack recommandée
- Next.js 14 + TypeScript + Tailwind
- @supabase/supabase-js pour l'API
- Reprendre les CSS du prototype pour l'identité visuelle
- Vercel pour l'hébergement

## Prompt pour Claude Code
```
Reprends les prototypes dans /Users/pardin/tracking djibril /tracking-export/
et branche-les sur l'API Supabase à https://nbnbsljqtolzzuqnkyae.supabase.co/functions/v1/tracking-app

Garde le design visuel intact (cosmos, capsules, forge).
Remplace uniquement la couche données (localStorage → API).
```
