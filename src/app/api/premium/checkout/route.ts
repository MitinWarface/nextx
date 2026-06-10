/**
 * POST /api/premium/checkout — создать платёж в YooKassa
 * Body: { planId: string }
 * Returns: { confirmation_url: string, paymentId: string }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { createPayment } from "@/lib/yookassa";

const schema = z.object({
  planId: z.string().min(1),
  promoCode: z.string().optional(),
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

    let finalAmountKopecks = plan.priceKopecks;
    let promoCodeRecord = null;

    if (body.promoCode) {
      promoCodeRecord = await prisma.promoCode.findFirst({
        where: {
          code: body.promoCode.toUpperCase(),
          isActive: true,
        },
      });

      if (!promoCodeRecord) {
        throw new HttpError(400, "promo_code_not_found");
      }

      if (promoCodeRecord.expiresAt && promoCodeRecord.expiresAt < new Date()) {
        throw new HttpError(400, "promo_code_expired");
      }

      if (promoCodeRecord.maxUses !== null && promoCodeRecord.usedCount >= promoCodeRecord.maxUses) {
        throw new HttpError(400, "promo_code_limit_reached");
      }

      if (promoCodeRecord.planId !== null && promoCodeRecord.planId !== plan.id) {
        throw new HttpError(400, "promo_code_not_for_this_plan");
      }

      finalAmountKopecks = Math.max(1, Math.round(plan.priceKopecks * (1 - promoCodeRecord.discount / 100)));
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/premium/success`;

    const payment = await createPayment({
      amountKopecks: finalAmountKopecks,
      description: `NextX Premium — ${plan.name} (${plan.durationDays} дн.)`,
      metadata: {
        userId: user!.id,
        planId: plan.id,
        ...(promoCodeRecord ? { promoCodeId: promoCodeRecord.id } : {}),
      },
      return_url: returnUrl,
    });

    if (promoCodeRecord) {
      await prisma.promoCode.update({
        where: { id: promoCodeRecord.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    await prisma.payment.create({
      data: {
        userId: user!.id,
        planId: plan.id,
        provider: "yookassa",
        amountKopecks: finalAmountKopecks,
        status: "PENDING",
        externalId: payment.id,
      },
    });

    return ok({
      confirmation_url: payment.confirmation?.confirmation_url,
      paymentId: payment.id,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
