const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const features = await prisma.feature.findMany();
  console.log("Features:", JSON.stringify(features, null, 2));
  const plans = await prisma.subscriptionPlan.findMany();
  console.log("Plans:", JSON.stringify(plans, null, 2));
  const pfs = await prisma.planFeature.findMany();
  console.log("PlanFeatures:", pfs.length, "rows");
  await prisma.$disconnect();
})();
