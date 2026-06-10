/**
 * POST /api/wallet/topup — создать платёж пополнения кошелька через YooKassa
 * Body: { amount: number } (в рублях, min 10, max 100000)
 * Returns: { confirmationUrl, paymentId }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { createPayment } from "@/lib/yookassa";

const schema = z.object({
  amount: z.number().min(10).max(100000),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await parseJson(req, schema);
    const amount = Math.round(body.amount);
    const amountKopecks = amount * 100;

    const returnUrl = `${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"}/wallet/success`;

    const payment = await createPayment({
      amountKopecks,
      description: `Пополнение кошелька NextX — ${amount} ₽`,
      metadata: {
        userId: user!.id,
        type: "wallet_topup",
        amount: String(amount),
      },
      return_url: returnUrl,
    });

    await prisma.payment.create({
      data: {
        userId: user!.id,
        planId: null as any,
        provider: "yookassa",
        amountKopecks,
        status: "PENDING",
        externalId: payment.id,
      },
    });

    return ok({
      confirmationUrl: payment.confirmation?.confirmation_url,
      paymentId: payment.id,
    });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
