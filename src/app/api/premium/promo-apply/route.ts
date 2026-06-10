/**
 * POST /api/premium/promo-apply — проверить промокод и вернуть скидку
 * Body: { code: string, planId: string }
 * Returns: { discount, discountedPrice, promoCode }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const schema = z.object({
  code: z.string().min(1).max(50),
  planId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await parseJson(req, schema);

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: body.planId },
    });
    if (!plan) throw new HttpError(404, "plan_not_found");

    const promoCode = await prisma.promoCode.findFirst({
      where: {
        code: body.code.toUpperCase(),
        isActive: true,
      },
    });

    if (!promoCode) {
      throw new HttpError(404, "promo_code_not_found");
    }

    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
      throw new HttpError(400, "promo_code_expired");
    }

    if (promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses) {
      throw new HttpError(400, "promo_code_limit_reached");
    }

    if (promoCode.planId !== null && promoCode.planId !== body.planId) {
      throw new HttpError(400, "promo_code_not_for_this_plan");
    }

    const discount = promoCode.discount;
    const discountedPrice = Math.max(1, Math.round(plan.priceKopecks * (1 - discount / 100)));

    return ok({
      discount,
      discountedPrice,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discount: promoCode.discount,
      },
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
