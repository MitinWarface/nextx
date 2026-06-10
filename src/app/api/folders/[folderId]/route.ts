/**
 * PUT    /api/folders/:id   — обновить папку
 * DELETE /api/folders/:id   — удалить папку
 * POST   /api/folders/:id/chats — добавить чат в папку
 * DELETE /api/folders/:id/chats — убрать чат из папки
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { folderId } = await params;
    const body = await req.json();
    const folder = await prisma.chatFolder.updateMany({
      where: { id: folderId, userId: user!.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
    if (folder.count === 0)
      throw new HttpError(404, "folder_not_found");
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { folderId } = await params;
    await prisma.folderChat.deleteMany({ where: { folderId } });
    const del = await prisma.chatFolder.deleteMany({
      where: { id: folderId, userId: user!.id },
    });
    if (del.count === 0)
      throw new HttpError(404, "folder_not_found");
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { folderId } = await params;
    const body = await req.json();
    const chatId = body.chatId as string;
    if (!chatId) throw new HttpError(400, "chatId_required");

    // Verify ownership
    const folder = await prisma.chatFolder.findFirst({
      where: { id: folderId, userId: user!.id },
    });
    if (!folder)
      throw new HttpError(404, "folder_not_found");

    await prisma.folderChat.upsert({
      where: { folderId_chatId: { folderId, chatId } },
      create: { folderId, chatId },
      update: {},
    });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { folderId } = await params;
    const body = await req.json();
    const chatId = body.chatId as string;
    if (!chatId) throw new HttpError(400, "chatId_required");

    await prisma.folderChat.deleteMany({
      where: { folderId, chatId },
    });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
