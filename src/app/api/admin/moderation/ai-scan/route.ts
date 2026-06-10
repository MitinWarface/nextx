import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { moderateContent } from "@/lib/ai-moderation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { text, messageId } = body as { text?: string; messageId?: string };

    if (!text && !messageId) {
      throw new HttpError(400, "text_or_messageId_required");
    }

    let scanText = text;
    if (!scanText && messageId) {
      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        select: { content: true, senderId: true, chatId: true },
      });
      if (!msg) throw new HttpError(404, "message_not_found");
      scanText = msg.content ?? "";
    }

    const result = await moderateContent(scanText!);

    return ok({
      text: scanText,
      ...result,
      scannedBy: admin.id,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "50"));
    const type = searchParams.get("type") ?? undefined;

    const where: Record<string, unknown> = { type: "ai_toxicity" };
    if (type) where.type = type;

    const logs = await prisma.moderationLog.findMany({
      where: { type: { contains: "ai" } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    const total = await prisma.moderationLog.count({
      where: { type: { contains: "ai" } },
    });

    return ok({ logs, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}
