/**
 * GET /api/chats/[chatId]/messages/by-date?date=YYYY-MM-DD
 * Returns the first message ID after the given date (for scroll-to).
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new HttpError(400, "invalid_date");
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

    // Find the first message on or after the selected date
    const message = await prisma.message.findFirst({
      where: {
        chatId,
        isDeleted: false,
        createdAt: { gte: targetDate, lt: nextDate },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true },
    });

    // If no message found on that exact day, find the first one after
    const fallback = !message
      ? await prisma.message.findFirst({
          where: {
            chatId,
            isDeleted: false,
            createdAt: { gte: nextDate },
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, createdAt: true },
        })
      : null;

    const result = message ?? fallback;

    if (!result) {
      throw new HttpError(404, "no_messages_found");
    }

    return ok({ messageId: result.id, createdAt: result.createdAt.toISOString() });
  } catch (err) {
    return fail(err);
  }
}
