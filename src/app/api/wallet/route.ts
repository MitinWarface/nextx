/**
 * GET  /api/wallet — get my wallet balance + transactions
 * POST /api/wallet/topup — simulate topup (for dev)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    let wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: user!.id } });
    }

    const transactions = await prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({ wallet, transactions });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || amount <= 0 || amount > 100_000_000) {
      throw new HttpError(400, "invalid_amount");
    }

    let wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: user!.id, balance: 0 } });
    }

    await prisma.$transaction([
      prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } }),
      prisma.transaction.create({
        data: { walletId: wallet.id, type: "DEPOSIT", amount, description: "Пополнение кошелька" },
      }),
    ]);

    const updated = await prisma.wallet.findUnique({ where: { id: wallet.id } });
    return ok({ wallet: updated });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
