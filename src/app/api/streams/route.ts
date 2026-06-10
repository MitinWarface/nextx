/**
 * GET  /api/streams?chatId=... — list streams for a chat
 * POST /api/streams            — create a new stream
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

const createSchema = z.object({
  chatId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    if (!chatId) throw new HttpError(400, "chatId_required");

    const streams = await prisma.liveStream.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ streams });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "invalid_json");
    const parsed = createSchema.parse(body);

    const member = await prisma.participant.findFirst({
      where: { chatId: parsed.chatId, userId: user!.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!member) throw new HttpError(403, "not_authorized");

    const stream = await prisma.liveStream.create({
      data: {
        chatId: parsed.chatId,
        title: parsed.title,
        description: parsed.description ?? null,
      },
    });
    return created({ stream });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
