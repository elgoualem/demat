# Marketplace MVP — scaffold technique

Backend minimal du parcours **natif** : catalogue → commande → orchestrateur → connecteur fournisseur (mock) → facture.
Correspond à la priorisation MVP définie précédemment (parcours natif + externe, facturation unitaire, un connecteur fournisseur).

## Structure

```
prisma/schema.prisma   modèle de données (User, Organization, Membership, Provider, Service, Order, Invoice, Event)
prisma/seed.ts         données de démo (3 fournisseurs, 6 services sur 3 catégories)
src/connectors/        contrat ProviderConnector + connecteur mock + registre
src/orchestrator/      routage fournisseur, retries, idempotency key, event log
src/routes/            API REST (auth, services, orders, organizations)
src/middleware/auth.ts JWT minimal
frontend/               frontend Next.js (catalogue, auth, organisations, suivi de commande) — voir frontend/README.md
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
- `POST /auth/register` — `{ "email": "...", "name": "..." }` → crée l'utilisateur, renvoie `{ token, user }`
- `POST /auth/login` — `{ "email": "..." }` → renvoie `{ token, user }`
- `GET /services` — catalogue
- `POST /orders` (Bearer JWT) — `{ "serviceId": "...", "organizationId": "..." }` (organizationId optionnel : commande B2C si absent, B2B rattachée à l'organisation sinon)
- `GET /orders/:id` (Bearer JWT) — auteur de la commande ou membre de son organisation

Organisations (B2B, Bearer JWT requis) :
- `POST /organizations` — `{ "name": "...", "vatNumber": "..." }` → crée l'organisation, créateur = OWNER
- `GET /organizations` — organisations dont l'utilisateur est membre
- `GET /organizations/:id` — détail + membres (membres uniquement)
- `GET /organizations/:id/orders` — facturation consolidée (membres uniquement)
- `POST /organizations/:id/members` — `{ "email": "...", "role": "ADMIN"|"MEMBER" }` (OWNER/ADMIN uniquement, l'email doit déjà avoir un compte)
- `DELETE /organizations/:id/members/:userId` (OWNER/ADMIN uniquement, un OWNER ne peut pas être retiré)

Commission plateforme : chaque `Provider` a sa propre politique (`commissionType` : `PERCENTAGE` en points de base, ou `FIXED` en centimes). Elle est calculée à la création de chaque commande (`Order.platformFee`) et **n'est jamais renvoyée par une route accessible aux clients** — exclue explicitement de `POST/GET /orders` et `GET /organizations/:id/orders`.
- `GET /admin/commissions` (Bearer JWT, réservé à `User.isAdmin = true`) — commission totale, détail par fournisseur, historique des commandes confirmées
- Pas de self-service pour devenir admin : définir `ADMIN_EMAIL` dans `.env` avant `npm run seed` désigne ce compte comme admin (ou passer `isAdmin: true` manuellement en base)

## Déploiement Railway

1. Créer un dépôt GitHub, y pousser ce code.
2. Sur Railway : nouveau projet → déployer depuis ce repo GitHub.
3. Ajouter un service Postgres dans le même projet Railway (`DATABASE_URL` injectée automatiquement).
4. Variables à définir : `JWT_SECRET`.
5. Build command : `npm run build && npx prisma migrate deploy` — start command : `npm start`.

## Ce qui manque volontairement (hors MVP)

Parcours hybride/externe, split payment, abonnements récurrents, rôles fins, app mobile — voir la roadmap v1/v2 définie en amont.
