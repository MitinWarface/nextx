import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  defaultTtlSeconds: z.number().int().min(60).max(604800).nullable().optional(),
  isContentProtected: z.boolean().optional(),
  slowModeSeconds: z.number().int().min(0).max(900).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { chatId } = await params;
    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { id: true },
    });
    if (!meP) return NextResponse.json({ error: "not_a_participant" }, { status: 403 });
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, name: true, description: true, avatarUrl: true, type: true, creatorId: true, slowModeSeconds: true, isContentProtected: true },
    });
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return ok(chat);
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { chatId } = await params;
    const body = patchSchema.parse(await req.json());

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "GROUP" && chat.type !== "CHANNEL") {
      throw new HttpError(400, "can_edit_only_group_or_channel");
    }
    // Проверяем, что пользователь — OWNER/ADMIN
    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!meP || (meP.role !== "OWNER" && meP.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description;
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl;
    if (body.defaultTtlSeconds !== undefined) {
      data.defaultTtlSeconds = body.defaultTtlSeconds;
    }
    if (body.isContentProtected !== undefined) {
      data.isContentProtected = body.isContentProtected;
    }
    if (body.slowModeSeconds !== undefined) {
      data.slowModeSeconds = body.slowModeSeconds;
    }

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        avatarUrl: true,
        defaultTtlSeconds: true,
        isContentProtected: true,
      },
    });
    return ok({ chat: updated });
  } catch (err) {
    return fail(err);
  }
}
