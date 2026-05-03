# Djibril Tracking — Portail Client

## URLs locales
- **Client**: http://localhost:8765/login
- **Admin**: http://localhost:8765/admin  
- **Health**: http://localhost:8765/health

## Connexion
Email + Prénom + Nom.  
Première connexion = compte créé.  
Connexions suivantes = reconnu.

## Admin
Panel sans authentification (privé, ne pas partager).  
Voir tous les clients, événements, stats globales.

## API
`POST /api/event` — Enregistre un événement tracking.
```json
{"event_type": "page_view", "metadata": {"page": "/dashboard"}}
```
Avec cookie de session OU `client_id` en paramètre.

## Lancement
```bash
cd ~/agence-ia/tracking
python3 server.py
```
