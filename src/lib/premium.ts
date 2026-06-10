/**
 * Premium system helpers — feature flags, activation, expiry.
 */
import { prisma } from "@/lib/prisma";

/**
 * Check if a user has a specific premium feature.
 */
export async function hasFeature(userId: string, featureCode: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      premiumStatus: true,
      premiumUntil: true,
      premiumPlan: {
        select: {
          features: {
            select: { feature: { select: { code: true } } },
          },
        },
      },
    },
  });

  if (!user) return false;
  if (user.premiumStatus !== "active") return false;
  if (user.premiumUntil && user.premiumUntil < new Date()) return false;

  return user.premiumPlan?.features.some((pf) => pf.feature.code === featureCode) ?? false;
}

/**
 * Get all features for a user.
 */
export async function getUserFeatures(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      premiumStatus: true,
      premiumUntil: true,
      premiumPlan: {
        select: {
          features: {
            select: { feature: { select: { code: true } } },
          },
        },
      },
    },
  });

  if (!user) return [];
  if (user.premiumStatus !== "active") return [];
  if (user.premiumUntil && user.premiumUntil < new Date()) return [];

  return user.premiumPlan?.features.map((pf) => pf.feature.code) ?? [];
}

/**
 * Check if user's premium is active.
 */
export async function isPremiumActive(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { premiumStatus: true, premiumUntil: true },
  });

  if (!user) return false;
  if (user.premiumStatus !== "active") return false;
  if (user.premiumUntil && user.premiumUntil < new Date()) return false;
  return true;
}

/**
 * Activate premium for a user after payment.
 */
export async function activatePremium(userId: string, planId: string): Promise<void> {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("plan_not_found");

  const now = new Date();
  const until = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  // If user already has active premium, extend from current expiry
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { premiumStatus: true, premiumUntil: true },
  });

  let finalUntil = until;
  if (user?.premiumStatus === "active" && user.premiumUntil && user.premiumUntil > now) {
    finalUntil = new Date(user.premiumUntil.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      premiumStatus: "active",
      premiumUntil: finalUntil,
      premiumPlanId: planId,
    },
  });
}

/**
 * Check and expire subscriptions (run periodically).
 */
export async function expireSubscriptions(): Promise<number> {
  const result = await prisma.user.updateMany({
    where: {
      premiumStatus: "active",
      premiumUntil: { lt: new Date() },
    },
    data: { premiumStatus: "expired" },
  });
  return result.count;
}

/**
 * Get max upload size for user (bytes).
 */
export async function getMaxUploadSize(userId: string): Promise<number> {
  const FREE_LIMIT = 10 * 1024 * 1024; // 10 MB
  const PREMIUM_LIMIT = 4 * 1024 * 1024 * 1024; // 4 GB

  if (await hasFeature(userId, "large_upload")) return PREMIUM_LIMIT;
  return FREE_LIMIT;
}

/**
 * Get premium status info for client.
 */
export async function getPremiumInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      premiumStatus: true,
      premiumUntil: true,
      premiumPlan: {
        select: {
          id: true,
          name: true,
          durationDays: true,
          priceKopecks: true,
        },
      },
    },
  });

  if (!user) return null;

  const isActive = user.premiumStatus === "active" && (!user.premiumUntil || user.premiumUntil > new Date());
  const features = isActive ? await getUserFeatures(userId) : [];

  return {
    isPremium: isActive,
    status: user.premiumStatus,
    until: user.premiumUntil?.toISOString() ?? null,
    plan: user.premiumPlan ?? null,
    features,
  };
}
