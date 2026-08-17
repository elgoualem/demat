import { PrismaClient, CommissionType, AdminScope } from "@prisma/client";

const prisma = new PrismaClient();

// Taxonomie DigiGo (spécification DigiGo, sections 5 à 11) : catégories
// principales et leurs sous-catégories, dans l'ordre de présentation client.
interface CategorySeed {
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  subcategories: Array<{ name: string; slug: string; sortOrder: number }>;
}

const CATEGORIES: CategorySeed[] = [
  {
    name: "Recharges", slug: "recharges", icon: "📱", sortOrder: 1,
    subcategories: [
      { name: "Recharge téléphonique", slug: "recharge-telephonique", sortOrder: 1 },
      { name: "Recharge internet", slug: "recharge-internet", sortOrder: 2 },
      { name: "Recharge forfait mobile", slug: "recharge-forfait-mobile", sortOrder: 3 },
      { name: "Recharge internationale", slug: "recharge-internationale", sortOrder: 4 },
    ],
  },
  {
    name: "Argent & paiements", slug: "argent-paiements", icon: "💳", sortOrder: 2,
    subcategories: [
      { name: "Recharge de portefeuille", slug: "recharge-portefeuille", sortOrder: 1 },
      { name: "Transfert d'argent", slug: "transfert-argent", sortOrder: 2 },
      { name: "Envoi international", slug: "envoi-international", sortOrder: 3 },
      { name: "Réception d'argent", slug: "reception-argent", sortOrder: 4 },
      { name: "Cartes bancaires prépayées", slug: "cartes-bancaires-prepayees", sortOrder: 5 },
      { name: "Paiement en ligne", slug: "paiement-en-ligne", sortOrder: 6 },
      { name: "Vérification de transaction", slug: "verification-transaction", sortOrder: 7 },
    ],
  },
  {
    name: "Cartes prépayées", slug: "cartes-prepayees", icon: "🎁", sortOrder: 3,
    subcategories: [
      { name: "Cartes Visa", slug: "cartes-visa", sortOrder: 1 },
      { name: "Cartes Mastercard", slug: "cartes-mastercard", sortOrder: 2 },
      { name: "Cartes de débit", slug: "cartes-debit", sortOrder: 3 },
      { name: "Cartes cadeaux", slug: "cartes-cadeaux", sortOrder: 4 },
      { name: "Cartes de jeux", slug: "cartes-jeux", sortOrder: 5 },
      { name: "Cartes de streaming", slug: "cartes-streaming", sortOrder: 6 },
      { name: "Cartes de téléphonie", slug: "cartes-telephonie", sortOrder: 7 },
    ],
  },
  {
    name: "Voyages", slug: "voyages", icon: "✈️", sortOrder: 4,
    subcategories: [
      { name: "Billets d'avion", slug: "billets-avion", sortOrder: 1 },
      { name: "Billets de bus", slug: "billets-bus", sortOrder: 2 },
      { name: "Billets de train", slug: "billets-train", sortOrder: 3 },
      { name: "Hôtels", slug: "hotels", sortOrder: 4 },
      { name: "Transferts", slug: "transferts-voyage", sortOrder: 5 },
      { name: "Activités", slug: "activites", sortOrder: 6 },
      { name: "Assurance voyage", slug: "assurance-voyage", sortOrder: 7 },
    ],
  },
  {
    name: "Assurances", slug: "assurances", icon: "🛡️", sortOrder: 5,
    subcategories: [
      { name: "Voyage", slug: "assurance-voyage-cat", sortOrder: 1 },
      { name: "Santé", slug: "assurance-sante", sortOrder: 2 },
      { name: "Véhicule", slug: "assurance-vehicule", sortOrder: 3 },
      { name: "Habitation", slug: "assurance-habitation", sortOrder: 4 },
      { name: "Téléphone", slug: "assurance-telephone", sortOrder: 5 },
    ],
  },
  {
    name: "Factures & services", slug: "factures-services", icon: "🧾", sortOrder: 6,
    subcategories: [
      { name: "Téléphone", slug: "facture-telephone", sortOrder: 1 },
      { name: "Internet", slug: "facture-internet", sortOrder: 2 },
      { name: "Électricité", slug: "facture-electricite", sortOrder: 3 },
      { name: "Eau", slug: "facture-eau", sortOrder: 4 },
      { name: "Télévision", slug: "facture-television", sortOrder: 5 },
      { name: "Abonnements numériques", slug: "abonnements-numeriques", sortOrder: 6 },
    ],
  },
];

// Reclasse les produits legacy (champ `category` à plat : "telephonie",
// "argent", "voyage", ...) vers une sous-catégorie DigiGo par défaut. Mapping
// best-effort pour la donnée de démo existante ; un admin peut réassigner
// individuellement chaque produit ensuite (voir /admin/products).
const LEGACY_CATEGORY_TO_SUBCATEGORY: Record<string, string> = {
  telephonie: "recharge-telephonique",
  argent: "transfert-argent",
  voyage: "billets-avion",
};

interface ProviderSeed {
  name: string;
  slug: string;
  connectorKey: string;
  commissionType: CommissionType;
  commissionValue: number;
}

interface ProductSeed {
  name: string;
  slug: string;
  category: string;
  description: string;
  consumptionType: "UNIT" | "SUBSCRIPTION" | "USAGE";
  offers: Array<{
    providerSlug: string;
    price: number;
    rating: number;
    salesCount: number;
    deliverySeconds: number;
    kycVerified: boolean;
  }>;
}

const PROVIDERS: ProviderSeed[] = [
  { name: "Kora Digital", slug: "kora-digital", connectorKey: "mock-telecom", commissionType: "PERCENTAGE", commissionValue: 500 },
  { name: "Axis Telecom Pro", slug: "axis-telecom-pro", connectorKey: "mock-telecom", commissionType: "PERCENTAGE", commissionValue: 600 },
  { name: "NetGate Distrib", slug: "netgate-distrib", connectorKey: "mock-finance", commissionType: "FIXED", commissionValue: 150 },
  { name: "Solva Partners", slug: "solva-partners", connectorKey: "mock-finance", commissionType: "PERCENTAGE", commissionValue: 400 },
  { name: "Mbengo Services", slug: "mbengo-services", connectorKey: "mock-voyage", commissionType: "PERCENTAGE", commissionValue: 800 },
  { name: "Aventure Voyages", slug: "aventure-voyages", connectorKey: "mock-voyage", commissionType: "FIXED", commissionValue: 300 },
];

const PRODUCTS: ProductSeed[] = [
  {
    name: "Forfait mobile 20Go",
    slug: "forfait-20go",
    category: "telephonie",
    description: "Forfait mobile 20Go sans engagement.",
    consumptionType: "SUBSCRIPTION",
    offers: [
      { providerSlug: "kora-digital", price: 999, rating: 4.9, salesCount: 8420, deliverySeconds: 8, kycVerified: true },
      { providerSlug: "axis-telecom-pro", price: 1049, rating: 4.7, salesCount: 3190, deliverySeconds: 15, kycVerified: true },
    ],
  },
  {
    name: "Forfait mobile illimité",
    slug: "forfait-illimite",
    category: "telephonie",
    description: "Forfait mobile data illimitée.",
    consumptionType: "SUBSCRIPTION",
    offers: [
      { providerSlug: "kora-digital", price: 1999, rating: 4.9, salesCount: 6210, deliverySeconds: 10, kycVerified: true },
      { providerSlug: "axis-telecom-pro", price: 1899, rating: 4.6, salesCount: 2480, deliverySeconds: 20, kycVerified: false },
    ],
  },
  {
    name: "Transfert d'argent instantané",
    slug: "transfert-instantane",
    category: "argent",
    description: "Envoi d'argent instantané vers un bénéficiaire, sans frais cachés.",
    consumptionType: "UNIT",
    offers: [
      { providerSlug: "netgate-distrib", price: 500, rating: 4.8, salesCount: 12940, deliverySeconds: 9, kycVerified: true },
      { providerSlug: "solva-partners", price: 480, rating: 4.4, salesCount: 980, deliverySeconds: 40, kycVerified: false },
    ],
  },
  {
    name: "Compte d'épargne",
    slug: "compte-epargne",
    category: "argent",
    description: "Ouverture d'un compte d'épargne rémunéré en quelques minutes.",
    consumptionType: "SUBSCRIPTION",
    offers: [
      { providerSlug: "netgate-distrib", price: 0, rating: 4.8, salesCount: 5106, deliverySeconds: 12, kycVerified: true },
      { providerSlug: "solva-partners", price: 0, rating: 4.6, salesCount: 2318, deliverySeconds: 25, kycVerified: true },
    ],
  },
  {
    name: "Billet d'avion Paris → Lisbonne",
    slug: "billet-paris-lisbonne",
    category: "voyage",
    description: "Aller simple, bagage en soute inclus.",
    consumptionType: "UNIT",
    offers: [
      { providerSlug: "mbengo-services", price: 8900, rating: 4.7, salesCount: 1840, deliverySeconds: 30, kycVerified: true },
      { providerSlug: "aventure-voyages", price: 9200, rating: 4.5, salesCount: 760, deliverySeconds: 60, kycVerified: false },
    ],
  },
  {
    name: "Assurance voyage annuelle",
    slug: "assurance-voyage-annuelle",
    category: "voyage",
    description: "Couverture médicale et annulation, valable un an, tous pays.",
    consumptionType: "SUBSCRIPTION",
    offers: [
      { providerSlug: "mbengo-services", price: 4900, rating: 4.7, salesCount: 1020, deliverySeconds: 20, kycVerified: true },
      { providerSlug: "aventure-voyages", price: 4650, rating: 4.3, salesCount: 410, deliverySeconds: 45, kycVerified: false },
    ],
  },
];

async function main() {
  const subcategoryIds = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, sortOrder: cat.sortOrder },
    });
    for (const sub of cat.subcategories) {
      const subcategory = await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: sub.slug } },
        update: { name: sub.name, sortOrder: sub.sortOrder },
        create: { name: sub.name, slug: sub.slug, sortOrder: sub.sortOrder, categoryId: category.id },
      });
      subcategoryIds.set(sub.slug, subcategory.id);
    }
  }

  const providerIds = new Map<string, string>();
  for (const p of PROVIDERS) {
    const provider = await prisma.provider.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        connectorKey: p.connectorKey,
        commissionType: p.commissionType,
        commissionValue: p.commissionValue,
      },
    });
    providerIds.set(p.slug, provider.id);
  }

  for (const prod of PRODUCTS) {
    const subcategorySlug = LEGACY_CATEGORY_TO_SUBCATEGORY[prod.category];
    const subcategoryId = subcategorySlug ? subcategoryIds.get(subcategorySlug) : undefined;
    const product = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        name: prod.name,
        slug: prod.slug,
        category: prod.category,
        subcategoryId,
        description: prod.description,
        consumptionType: prod.consumptionType,
        currency: "EUR",
        journeyType: "NATIVE",
      },
    });

    for (const offer of prod.offers) {
      const providerId = providerIds.get(offer.providerSlug)!;
      await prisma.offer.upsert({
        where: { productId_providerId: { productId: product.id, providerId } },
        update: {},
        create: {
          productId: product.id,
          providerId,
          price: offer.price,
          rating: offer.rating,
          salesCount: offer.salesCount,
          deliverySeconds: offer.deliverySeconds,
          kycVerified: offer.kycVerified,
        },
      });
    }
  }

  // Reclasse tout produit existant (créé hors de ce seed, ex. via l'admin ou un
  // import de catalogue fournisseur) qui n'a pas encore de sous-catégorie —
  // mapping best-effort sur son champ `category` legacy, sinon laissé non classé
  // pour reclassement manuel dans /admin/products plutôt qu'un choix arbitraire.
  const unclassified = await prisma.product.findMany({ where: { subcategoryId: null } });
  for (const product of unclassified) {
    const subcategorySlug = LEGACY_CATEGORY_TO_SUBCATEGORY[product.category];
    const subcategoryId = subcategorySlug ? subcategoryIds.get(subcategorySlug) : undefined;
    if (subcategoryId) {
      await prisma.product.update({ where: { id: product.id }, data: { subcategoryId } });
    }
  }

  // ADMIN_EMAIL (optionnel) : désigne l'opérateur de la plateforme, seul compte
  // avec tous les scopes d'office (y compris USERS, pour ensuite accorder des
  // accès plus limités à d'autres comptes). Pas de self-service par design.
  if (process.env.ADMIN_EMAIL) {
    const admin = await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL },
      update: { isAdmin: true },
      create: { email: process.env.ADMIN_EMAIL, isAdmin: true },
    });
    const allScopes: AdminScope[] = ["PROVIDERS", "CATALOG", "ORDERS", "COMMISSIONS", "ANALYTICS", "USERS"];
    await prisma.adminPermission.createMany({
      data: allScopes.map((scope) => ({ userId: admin.id, scope })),
      skipDuplicates: true,
    });
    console.log(`Admin désigné : ${process.env.ADMIN_EMAIL} (accès complet)`);
  }

  console.log("Seed terminé.");
}

main().finally(() => prisma.$disconnect());
