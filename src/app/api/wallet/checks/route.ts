/**
 * POST /api/wallet/checks — create a check
 * GET  /api/wallet/checks — list my created checks
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function generateCheckCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const parts: string[] = [];
  for (let p = 0; p < 2; p++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }
  return `CHECK-${parts[0]}-${parts[1]}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const checks = await prisma.walletCheck.findMany({
      where: { creatorId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok({ checks });
  } catch (err) {
    return fail(err);
  }
}

const createSchema = z.object({
  amount: z.number().int().positive(),
  activations: z.number().int().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await parseJson(req, createSchema);

    const totalCost = body.amount * body.activations;

    let wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: user!.id, balance: 0 } });
    }

    if (wallet.balance < totalCost) {
      throw new HttpError(402, "insufficient_balance");
    }

    const code = generateCheckCode();

    const check = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet!.id },
        data: { balance: { decrement: totalCost } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet!.id,
          type: "WITHDRAWAL",
          amount: -totalCost,
          description: `Создание чека: ${code} (${body.amount} NC × ${body.activations})`,
        },
      });

      return tx.walletCheck.create({
        data: {
          code,
          creatorId: user!.id,
          amount: body.amount,
          activations: body.activations,
          activationsLeft: body.activations,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    });

    return ok({ check });
  } catch (err) {
    return fail(err);
  }
}
