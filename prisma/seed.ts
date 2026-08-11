import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.provider.upsert({
    where: { slug: "telecom-demo" },
    update: {},
    create: {
      name: "Telecom Demo",
      slug: "telecom-demo",
      connectorKey: "mock-telecom",
      commissionType: "PERCENTAGE",
      commissionValue: 500, // 5,00 %
    },
  });

  await prisma.service.upsert({
    where: { slug: "forfait-20go" },
    update: {},
    create: {
      providerId: provider.id,
      name: "Forfait mobile 20Go",
      slug: "forfait-20go",
      category: "telephonie",
      description: "Forfait mobile 20Go sans engagement.",
      price: 999,
      currency: "EUR",
      consumptionType: "SUBSCRIPTION",
      journeyType: "NATIVE",
    },
  });

  await prisma.service.upsert({
    where: { slug: "forfait-illimite" },
    update: {},
    create: {
      providerId: provider.id,
      name: "Forfait mobile illimité",
      slug: "forfait-illimite",
      category: "telephonie",
      description: "Forfait mobile data illimitée.",
      price: 1999,
      currency: "EUR",
      consumptionType: "SUBSCRIPTION",
      journeyType: "NATIVE",
    },
  });

  const financeProvider = await prisma.provider.upsert({
    where: { slug: "finance-demo" },
    update: {},
    create: {
      name: "Finance Demo",
      slug: "finance-demo",
      connectorKey: "mock-finance",
      commissionType: "FIXED",
      commissionValue: 150, // 1,50 € par transaction
    },
  });

  await prisma.service.upsert({
    where: { slug: "transfert-instantane" },
    update: {},
    create: {
      providerId: financeProvider.id,
      name: "Transfert d'argent instantané",
      slug: "transfert-instantane",
      category: "argent",
      description: "Envoi d'argent instantané vers un bénéficiaire, sans frais cachés.",
      price: 500,
      currency: "EUR",
      consumptionType: "UNIT",
      journeyType: "NATIVE",
    },
  });

  await prisma.service.upsert({
    where: { slug: "compte-epargne" },
    update: {},
    create: {
      providerId: financeProvider.id,
      name: "Compte d'épargne",
      slug: "compte-epargne",
      category: "argent",
      description: "Ouverture d'un compte d'épargne rémunéré en quelques minutes.",
      price: 0,
      currency: "EUR",
      consumptionType: "SUBSCRIPTION",
      journeyType: "NATIVE",
    },
  });

  const voyageProvider = await prisma.provider.upsert({
    where: { slug: "voyage-demo" },
    update: {},
    create: {
      name: "Voyage Demo",
      slug: "voyage-demo",
      connectorKey: "mock-voyage",
      commissionType: "PERCENTAGE",
      commissionValue: 800, // 8,00 %
    },
  });

  await prisma.service.upsert({
    where: { slug: "billet-paris-lisbonne" },
    update: {},
    create: {
      providerId: voyageProvider.id,
      name: "Billet d'avion Paris → Lisbonne",
      slug: "billet-paris-lisbonne",
      category: "voyage",
      description: "Aller simple, bagage en soute inclus.",
      price: 8900,
      currency: "EUR",
      consumptionType: "UNIT",
      journeyType: "NATIVE",
    },
  });

  await prisma.service.upsert({
    where: { slug: "assurance-voyage-annuelle" },
    update: {},
    create: {
      providerId: voyageProvider.id,
      name: "Assurance voyage annuelle",
      slug: "assurance-voyage-annuelle",
      category: "voyage",
      description: "Couverture médicale et annulation, valable un an, tous pays.",
      price: 4900,
      currency: "EUR",
      consumptionType: "SUBSCRIPTION",
      journeyType: "NATIVE",
    },
  });

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
