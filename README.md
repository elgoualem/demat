# Marketplace MVP — scaffold technique

Backend minimal du parcours **natif** : catalogue → commande → orchestrateur → connecteur fournisseur (mock) → facture.
Correspond à la priorisation MVP définie précédemment (parcours natif + externe, facturation unitaire, un connecteur fournisseur).

## Structure

```
prisma/schema.prisma   modèle de données (User, Provider, Service, Order, Invoice, Event)
prisma/seed.ts         données de démo (1 fournisseur, 2 services)
src/connectors/        contrat ProviderConnector + connecteur mock + registre
src/orchestrator/      routage fournisseur, retries, idempotency key, event log
src/routes/            API REST (services, orders)
src/middleware/auth.ts JWT minimal
```

## Lancer en local

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL (Postgres)
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Endpoints :
- `GET /services` — catalogue
- `POST /orders` (Bearer JWT) — `{ "serviceId": "..." }`
- `GET /orders/:id` (Bearer JWT)

## Déploiement Railway

1. Créer un dépôt GitHub, y pousser ce code.
2. Sur Railway : nouveau projet → déployer depuis ce repo GitHub.
3. Ajouter un service Postgres dans le même projet Railway (`DATABASE_URL` injectée automatiquement).
4. Variables à définir : `JWT_SECRET`.
5. Build command : `npm run build && npx prisma migrate deploy` — start command : `npm start`.

## Ce qui manque volontairement (hors MVP)

Parcours hybride/externe, split payment, abonnements récurrents, rôles fins, app mobile — voir la roadmap v1/v2 définie en amont.
