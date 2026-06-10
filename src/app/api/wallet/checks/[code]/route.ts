/**
 * POST /api/wallet/checks/[code] — claim a check
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { code: rawCode } = await params;
    const code = rawCode?.toUpperCase();

    if (!code) {
      throw new HttpError(400, "code_required");
    }

    const check = await prisma.walletCheck.findUnique({
      where: { code },
    });

    if (!check) {
      throw new HttpError(404, "check_not_found");
    }

    if (check.creatorId === user!.id) {
      throw new HttpError(400, "cannot_claim_own_check");
    }

    if (check.activationsLeft <= 0) {
      throw new HttpError(400, "check_fully_claimed");
    }

    if (check.expiresAt && check.expiresAt < new Date()) {
      throw new HttpError(400, "check_expired");
    }

    const alreadyClaimed = await prisma.walletClaim.findUnique({
      where: { checkId_userId: { checkId: check.id, userId: user!.id } },
    });

    if (alreadyClaimed) {
      throw new HttpError(400, "already_claimed");
    }

    let wallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: user!.id, balance: 0 } });
    }

    await prisma.$transaction(async (tx) => {
      await tx.walletClaim.create({
        data: { checkId: check.id, userId: user!.id },
      });

      await tx.walletCheck.update({
        where: { id: check.id },
        data: { activationsLeft: { decrement: 1 } },
      });

      await tx.wallet.update({
        where: { userId: user!.id },
        data: { balance: { increment: check.amount } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet!.id,
          type: "DEPOSIT",
          amount: check.amount,
          description: `Активация чека ${check.code}`,
          relatedId: check.id,
        },
      });
    });

    return ok({ success: true, amount: check.amount, code: check.code });
  } catch (err) {
    return fail(err);
  }
}
