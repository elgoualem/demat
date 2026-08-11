# Marketplace MVP — frontend

Frontend Next.js (App Router) pour le backend `marketplace-mvp` (racine du repo).

## Pages

- `/` — catalogue (`GET /services`), lancement d'une commande
- `/register`, `/login` — inscription / connexion (JWT stocké côté client)
- `/orders/[id]` — statut de la commande, facture, historique d'événements

## Lancer en local

Le backend doit tourner sur `http://localhost:3000` (voir README à la racine).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvre [http://localhost:3001](http://localhost:3001).
