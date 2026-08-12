# Marketplace MVP — scaffold technique

Backend minimal du parcours **natif** : catalogue → commande → orchestrateur → connecteur fournisseur (mock) → facture.
Correspond à la priorisation MVP définie précédemment (parcours natif + externe, facturation unitaire, un connecteur fournisseur).

## Structure

```
prisma/schema.prisma   modèle de données (User, Organization, Membership, Provider, Product, Offer, Order, Invoice, Event)
prisma/seed.ts         données de démo (6 fournisseurs, 6 produits sur 3 catégories, 2 offres/produit)
src/connectors/        contrat ProviderConnector + connecteur mock + registre
src/orchestrator/      routage fournisseur, retries, idempotency key, event log
src/routes/            API REST (auth, products, orders, organizations, admin)
src/middleware/auth.ts JWT minimal
frontend/               frontend Next.js (accueil, catalogue, comparaison d'offres, auth, organisations, suivi de commande) — voir frontend/README.md
```

Modèle multi-fournisseurs : un `Product` est l'item générique du catalogue (ce que le client cherche) ; chaque `Offer` est la cotation d'un `Provider` sur ce produit (son prix, sa note, ses ventes). Plusieurs fournisseurs peuvent coter le même produit — le client compare sur la page produit et choisit une offre, qui fige le fournisseur ET le prix au moment de la commande.

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
- `GET /products?category=...` — catalogue (prix "à partir de" + nombre d'offres actives par produit)
- `GET /products/:slug` — détail produit + offres actives triées par prix (fournisseur, note, ventes, délai, KYC)
- `POST /orders` (Bearer JWT) — `{ "offerId": "...", "organizationId": "..." }` (organizationId optionnel : commande B2C si absent, B2B rattachée à l'organisation sinon)
- `GET /orders/:id` (Bearer JWT) — auteur de la commande, membre de son organisation, ou admin
- `GET /orders/:id/invoice.pdf` (Bearer JWT, même contrôle d'accès) — PDF de la facture, si la commande en a une

Factures : une facture (`Invoice`) est créée automatiquement dès qu'une commande passe au statut Confirmée (parcours natif — le seul implémenté). Numéro légal séquentiel attribué par Postgres (jamais recalculé en JS, donc jamais de collision), formaté `FA-{année}-{numéro sur 6 chiffres}`. Le PDF (généré par `src/billing/generateInvoicePdf.ts`) inclut l'identité légale du vendeur (`COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_REGISTRATION_NUMBER`, `COMPANY_VAT_NUMBER` — affiche "à compléter" tant qu'ils ne sont pas renseignés en env, pour ne jamais faire passer un PDF incomplet pour une vraie facture), l'acheteur (particulier ou organisation B2B avec son n° de TVA), le détail de la ligne, et la répartition HT/TVA/TTC si `DEFAULT_VAT_RATE` est configuré (aucun taux de TVA n'est inventé par défaut).

Organisations (B2B, Bearer JWT requis) :
- `POST /organizations` — `{ "name": "...", "vatNumber": "..." }` → crée l'organisation, créateur = OWNER
- `GET /organizations` — organisations dont l'utilisateur est membre
- `GET /organizations/:id` — détail + membres (membres uniquement)
- `GET /organizations/:id/orders` — facturation consolidée (membres uniquement)
- `POST /organizations/:id/members` — `{ "email": "...", "role": "ADMIN"|"MEMBER" }` (OWNER/ADMIN uniquement, l'email doit déjà avoir un compte)
- `DELETE /organizations/:id/members/:userId` (OWNER/ADMIN uniquement, un OWNER ne peut pas être retiré)

Commission plateforme : chaque `Provider` a sa propre politique (`commissionType` : `PERCENTAGE` en points de base, ou `FIXED` en centimes). Elle est calculée à la création de chaque commande (`Order.platformFee`) et **n'est jamais renvoyée par une route accessible aux clients** — exclue explicitement de `POST/GET /orders` et `GET /organizations/:id/orders`.

Admin (Bearer JWT, réservé à `User.isAdmin = true` — toutes les routes `/admin/*` répondent 403 sinon) :
- `GET /admin/commissions` — commission totale, détail par fournisseur, historique des commandes confirmées
- `GET /admin/analytics?days=30` — chiffre d'affaires et commission par fournisseur, ventilés par jour (pour comparer plusieurs fournisseurs dans le temps), + diagnostic agrégé (volume de commandes, taux de confirmation, panier moyen) tous statuts confondus
- `GET/POST/PATCH /admin/providers[/:id]` — lister, créer, modifier (statut, commission, connecteur) ; `GET /admin/providers/:id` renvoie la fiche complète (toutes ses offres tous produits confondus, historique + diagnostic de ses commandes) — accessible depuis `/admin/providers/:id` côté frontend
- `GET/POST/PATCH /admin/products[/:id]` — lister, créer, modifier (le détail `:id` inclut toutes les offres, actives et inactives)
- `POST/PATCH /admin/offers[/:id]` — créer/modifier une offre (prix, note, ventes, délai, KYC, actif)
- `GET /admin/orders` — toutes les commandes de la plateforme, tous clients confondus, avec `platformFee` visible
- `GET/PATCH /admin/users[/:id]` — lister les comptes, promouvoir/révoquer l'accès admin (un admin ne peut pas se révoquer lui-même)

Interface : `/admin` côté frontend (lien "Admin" dans la nav, visible uniquement si `user.isAdmin`). Pas de self-service pour devenir admin : définir `ADMIN_EMAIL` dans `.env` avant `npm run seed` désigne ce compte comme premier admin (ensuite, la gestion des admins se fait depuis `/admin/users`).

## Déploiement Railway

1. Créer un dépôt GitHub, y pousser ce code.
2. Sur Railway : nouveau projet → déployer depuis ce repo GitHub.
3. Ajouter un service Postgres dans le même projet Railway (`DATABASE_URL` injectée automatiquement).
4. Variables à définir : `JWT_SECRET`.
5. Build command : `npm run build && npx prisma migrate deploy` — start command : `npm start`.

## Connecter un vrai fournisseur

Un `Provider.connectorKey` doit pointer vers un connecteur qui implémente `ProviderConnector` (`src/connectors/types.ts`). Deux façons de brancher un vrai fournisseur, sans jamais toucher à l'orchestrateur :

**1. Connecteur REST générique (`connectorKey: "generic-rest"`)** — pas de déploiement nécessaire, tout se configure depuis la fiche du fournisseur (`/admin/providers/:id`, section "Connexion API") : URL de base, clé API (secret write-only, jamais renvoyée en clair par l'API — seul un booléen `apiKeySet` l'indique), en-tête et préfixe d'authentification, chemin de création de commande, et le mapping des champs de réponse. Contrat par défaut attendu côté fournisseur :

```
POST {apiBaseUrl}{apiOrderPath}
Authorization: {apiAuthPrefix}{apiKey}
{ "external_reference": "...", "idempotency_key": "...", "amount": 1500, "currency": "EUR" }

→ 200 { "status": "confirmed", "provider_order_id": "..." }   (ou "reason" si échec)
```

Si le JSON du fournisseur utilise d'autres noms de champs (ex. `state` au lieu de `status`, `"ok"` au lieu de `"confirmed"`), ça se configure sans code via `apiStatusField` / `apiOrderIdField` / `apiConfirmedValue`.

**2. Connecteur dédié codé** — si l'API du fournisseur a une authentification propriétaire, des webhooks de confirmation asynchrone, ou une forme trop différente du contrat ci-dessus : nouvelle classe dans `src/connectors/` qui implémente `ProviderConnector`, enregistrée dans `src/connectors/registry.ts` sous une nouvelle clé. L'orchestrateur ne fait aucune différence entre les deux approches.

## Ce qui manque volontairement (hors MVP)

Parcours hybride/externe, split payment, abonnements récurrents, rôles fins, app mobile — voir la roadmap v1/v2 définie en amont.
