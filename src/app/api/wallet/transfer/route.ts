/**
 * POST /api/wallet/transfer — transfer NC to another user by username or publicId
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const transferSchema = z.object({
  to: z.string().min(1),
  amount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await parseJson(req, transferSchema);

    if (body.amount > 10_000_000) {
      throw new HttpError(400, "amount_too_large");
    }

    const recipient = await prisma.user!.findFirst({
      where: {
        OR: [{ username: body.to }, { id: body.to }],
      },
      select: { id: true, username: true, displayName: true },
    });

    if (!recipient) {
      throw new HttpError(404, "recipient_not_found");
    }

    if (recipient.id === user!.id) {
      throw new HttpError(400, "cannot_transfer_to_self");
    }

    let senderWallet = await prisma.wallet.findUnique({ where: { userId: user!.id } });
    if (!senderWallet) {
      senderWallet = await prisma.wallet.create({ data: { userId: user!.id, balance: 0 } });
    }

    if (senderWallet.balance < body.amount) {
      throw new HttpError(402, "insufficient_balance");
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: senderWallet!.id },
        data: { balance: { decrement: body.amount } },
      });

      const senderTx = await tx.transaction.create({
        data: {
          walletId: senderWallet!.id,
          type: "WITHDRAWAL",
          amount: -body.amount,
          description: `Перевод ${body.amount} NC → ${recipient.username}`,
        },
      });

      let recipientWallet = await tx.wallet.findUnique({ where: { userId: recipient.id } });
      if (!recipientWallet) {
        recipientWallet = await tx.wallet.create({ data: { userId: recipient.id, balance: 0 } });
      }

      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: body.amount } },
      });

      const recipientTx = await tx.transaction.create({
        data: {
          walletId: recipientWallet.id,
          type: "DEPOSIT",
          amount: body.amount,
          description: `Перевод ${body.amount} NC от ${user!.username}`,
        },
      });

      return { senderTxId: senderTx.id, recipientTxId: recipientTx.id };
    });

    const io = (globalThis as any).__ioInstance;
    if (io) {
      io.to(`user:${recipient.id}`).emit("wallet:transfer", {
        from: user!.username,
        fromDisplayName: user!.displayName,
        amount: body.amount,
      });
    }

    return ok({
      success: true,
      senderTransactionId: result.senderTxId,
      recipientTransactionId: result.recipientTxId,
      recipient: { username: recipient.username, displayName: recipient.displayName },
    });
  } catch (err) {
    return fail(err);
  }
}
