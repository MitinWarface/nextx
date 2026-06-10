import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));
    const status = searchParams.get("status") ?? undefined;

    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, email: true },
          },
          plan: {
            select: { id: true, name: true, durationDays: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    const summary = await prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amountKopecks: true },
      _count: { id: true },
    });

    return ok({
      payments,
      total,
      page,
      limit,
      totalRevenue: summary._sum.amountKopecks ?? 0,
      completedPayments: summary._count.id,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { paymentId, action } = body as { paymentId: string; action: string };

    if (!paymentId || action !== "refund") {
      throw new HttpError(400, "invalid_request");
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, amountKopecks: true, userId: true },
    });
    if (!payment) throw new HttpError(404, "payment_not_found");
    if (payment.status !== "COMPLETED") {
      throw new HttpError(400, "can_only_refund_completed");
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });

    // Credit back to wallet
    const wallet = await prisma.wallet.findUnique({ where: { userId: payment.userId } });
    if (wallet) {
      await prisma.wallet.update({
        where: { userId: payment.userId },
        data: { balance: { increment: payment.amountKopecks } },
      });
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: payment.amountKopecks,
          description: `Возврат по платежу ${paymentId}`,
        },
      });
    }

    return ok({ ok: true, refunded: true });
  } catch (err) {
    return fail(err);
  }
}
