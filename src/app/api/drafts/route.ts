/**
 * GET  /api/drafts         — все черновики текущего пользователя
 * POST /api/drafts         — сохранить/обновить черновик
 * DELETE /api/drafts?chatId=... — удалить черновик
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const drafts = await prisma.draft.findMany({
      where: { userId: user!.id },
      select: { chatId: true, content: true, updatedAt: true },
    });
    return ok({ drafts });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const chatId = body.chatId as string;
    const content = (body.content ?? "").trim();

    if (!chatId) throw new HttpError(400, "chatId_required");

    if (!content) {
      // Пустой контент = удалить черновик
      await prisma.draft.deleteMany({
        where: { userId: user!.id, chatId },
      });
      return ok({ deleted: true });
    }

    const draft = await prisma.draft.upsert({
      where: { userId_chatId: { userId: user!.id, chatId } },
      create: { userId: user!.id, chatId, content },
      update: { content },
    });
    return ok({ draft: { chatId: draft.chatId, content: draft.content, updatedAt: draft.updatedAt } });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    if (!chatId) throw new HttpError(400, "chatId_required");
    await prisma.draft.deleteMany({
      where: { userId: user!.id, chatId },
    });
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
