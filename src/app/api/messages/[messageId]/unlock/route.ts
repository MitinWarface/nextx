import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        isPaid: true,
        paidPrice: true,
        chatId: true,
        senderId: true,
      },
    });
    if (!message) throw new HttpError(404, "message_not_found");
    if (!message.isPaid || !message.paidPrice) throw new HttpError(400, "not_paid");

    // Already unlocked?
    const existing = await prisma.messageUnlock.findUnique({
      where: { messageId_userId: { messageId, userId: me.id } },
    });
    if (existing) return ok({ success: true, alreadyUnlocked: true });

    // Check wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: me.id },
      select: { id: true, balance: true },
    });
    if (!wallet || wallet.balance < message.paidPrice) {
      throw new HttpError(400, "insufficient_balance");
    }

    // Deduct NC and create unlock in a transaction
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: message.paidPrice } },
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amount: -message.paidPrice,
          description: `Unlock message ${messageId}`,
          relatedId: messageId,
        },
      }),
      prisma.messageUnlock.create({
        data: { messageId, userId: me.id },
      }),
    ]);

    return ok({ success: true, newBalance: wallet.balance - message.paidPrice });
  } catch (err) {
    return fail(err);
  }
}
