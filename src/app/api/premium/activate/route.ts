/**
 * POST /api/premium/activate — activate premium (simulated payment)
 * Body: { planId: string }
 *
 * In production, this would verify payment with a provider first.
 * For now, it directly activates premium.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { activatePremium } from "@/lib/premium";

const schema = z.object({
  planId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await parseJson(req, schema);

    // Verify plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: body.planId },
    });
    if (!plan) throw new HttpError(404, "plan_not_found");

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: user!.id,
        planId: body.planId,
        provider: "simulated",
        amountKopecks: plan.priceKopecks,
        status: "COMPLETED",
        paidAt: new Date(),
      },
    });

    // Activate premium
    await activatePremium(user!.id, body.planId);

    return ok({ activated: true, paymentId: payment.id });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
