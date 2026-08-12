import { PrismaClient, CommissionType } from "@prisma/client";

const prisma = new PrismaClient();

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
    const product = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        name: prod.name,
        slug: prod.slug,
        category: prod.category,
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

  // ADMIN_EMAIL (optionnel) : désigne l'opérateur de la plateforme, seul compte
  // pouvant consulter GET /admin/commissions. Pas de self-service par design.
  if (process.env.ADMIN_EMAIL) {
    await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL },
      update: { isAdmin: true },
      create: { email: process.env.ADMIN_EMAIL, isAdmin: true },
    });
    console.log(`Admin désigné : ${process.env.ADMIN_EMAIL}`);
  }

  console.log("Seed terminé.");
}

main().finally(() => prisma.$disconnect());
