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

  console.log("Seed terminé.");
}

main().finally(() => prisma.$disconnect());
