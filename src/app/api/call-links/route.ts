/**
 * GET  /api/call-links       — list user's call links
 * POST /api/call-links       — create new call link
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const links = await prisma.callLink.findMany({
      where: { creatorId: user!.id },
      include: {
        chat: {
          select: { id: true, name: true, avatarUrl: true, type: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      links: links.map((l) => ({
        id: l.id,
        code: l.code,
        createdAt: l.createdAt.toISOString(),
        expiresAt: l.expiresAt?.toISOString() ?? null,
        url: `https://nextx.app/call/${l.code}`,
        chat: l.chat
          ? { id: l.chat.id, name: l.chat.name, avatarUrl: l.chat.avatarUrl, type: l.chat.type }
          : null,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json().catch(() => ({}));
    const chatId = body?.chatId as string | undefined;
    const expiresIn = body?.expiresIn as number | undefined; // seconds

    if (chatId) {
      const chat = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat) throw new HttpError(404, "chat_not_found");
    }

    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
    } while (
      attempts < 10 &&
      (await prisma.callLink.findUnique({ where: { code } }))
    );

    if (attempts >= 10) throw new HttpError(500, "failed_generate_code");

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    const link = await prisma.callLink.create({
      data: {
        creatorId: user!.id,
        chatId: chatId ?? null,
        code,
        expiresAt,
      },
      include: {
        chat: {
          select: { id: true, name: true, avatarUrl: true, type: true },
        },
      },
    });

    return created({
      link: {
        id: link.id,
        code: link.code,
        createdAt: link.createdAt.toISOString(),
        expiresAt: link.expiresAt?.toISOString() ?? null,
        url: `https://nextx.app/call/${link.code}`,
        chat: link.chat
          ? { id: link.chat.id, name: link.chat.name, avatarUrl: link.chat.avatarUrl, type: link.chat.type }
          : null,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
