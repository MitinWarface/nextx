/**
 * POST /api/premium/webhook — YooKassa webhook handler
 *
 * YooKassa отправляет POST с событиями:
 * - payment.succeeded → активируем премиум
 * - payment.canceled → отмечаем платёж как failed
 * - payment.waiting_for_capture → ждём подтверждения
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { activatePremium } from "@/lib/premium";
import { verifyWebhookSignature, type YooKassaWebhookEvent } from "@/lib/yookassa";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const authHeader = req.headers.get("authorization");
    if (!verifyWebhookSignature(rawBody, authHeader)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const event: YooKassaWebhookEvent = JSON.parse(rawBody);

    const paymentId = event.event.id;
    const payment = await prisma.payment.findFirst({
      where: { externalId: paymentId },
    });

    if (!payment) {
      return new Response("Payment not found", { status: 404 });
    }

    const metaType = event.event.metadata?.type;

    switch (event.type) {
      case "payment.succeeded": {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
          },
        });

        if (metaType === "wallet_topup") {
          const amountStr = event.event.metadata?.amount;
          const amount = Number(amountStr);
          if (amount && amount > 0) {
            const amountKopecks = amount * 100;
            let wallet = await prisma.wallet.findUnique({
              where: { userId: payment.userId },
            });
            if (!wallet) {
              wallet = await prisma.wallet.create({
                data: { userId: payment.userId, balance: 0 },
              });
            }
            await prisma.$transaction([
              prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amountKopecks } },
              }),
              prisma.transaction.create({
                data: {
                  walletId: wallet.id,
                  type: "DEPOSIT",
                  amount: amountKopecks,
                  description: `Пополнение кошелька через YooKassa — ${amount} ₽`,
                },
              }),
            ]);
          }
        } else {
          if (payment.planId) {
            await activatePremium(payment.userId, payment.planId);
          }
        }
        break;
      }

      case "payment.canceled": {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        break;
      }

      case "payment.waiting_for_capture": {
        break;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[webhook] Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export const dynamic = "force-dynamic";
