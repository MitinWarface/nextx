/**
 * GET /api/premium/plans — list all subscription plans with features
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        features: {
          include: { feature: { select: { id: true, code: true, name: true } } },
        },
      },
    });

    return ok({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        durationDays: p.durationDays,
        priceKopecks: p.priceKopecks,
        isPopular: p.isPopular,
        features: p.features.map((pf) => pf.feature),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
