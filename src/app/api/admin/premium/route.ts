import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        features: {
          include: { feature: true },
        },
        _count: { select: { users: true, payments: true } },
      },
    });

    const allFeatures = await prisma.feature.findMany({ orderBy: { code: "asc" } });

    const mappedPlans = plans.map((p) => ({
      ...p,
      price: Math.round(p.priceKopecks / 100),
    }));

    return ok({ plans: mappedPlans, allFeatures });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { planId, priceKopecks, name, durationDays, isPopular, featureIds } = body as {
      planId: string;
      priceKopecks?: number;
      name?: string;
      durationDays?: number;
      isPopular?: boolean;
      featureIds?: string[];
    };

    if (!planId) throw new HttpError(400, "planId_required");

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new HttpError(404, "plan_not_found");

    const updates: any = {};
    if (priceKopecks !== undefined) updates.priceKopecks = priceKopecks;
    if (name !== undefined) updates.name = name;
    if (durationDays !== undefined) updates.durationDays = durationDays;
    if (isPopular !== undefined) updates.isPopular = isPopular;

    if (Object.keys(updates).length > 0) {
      await prisma.subscriptionPlan.update({ where: { id: planId }, data: updates });
    }

    if (featureIds !== undefined) {
      await prisma.planFeature.deleteMany({ where: { planId } });
      if (featureIds.length > 0) {
        await prisma.planFeature.createMany({
          data: featureIds.map((featureId) => ({ planId, featureId })),
        });
      }
    }

    await logAudit(admin.id, "SETTINGS_CHANGE", `plan:${planId}`, {
      updates: Object.keys(updates),
      featuresChanged: featureIds !== undefined,
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
