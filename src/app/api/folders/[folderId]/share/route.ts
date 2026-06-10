/**
 * POST /api/folders/:folderId/share — generate share link for folder
 * GET  /api/folders/:folderId/share — get folder chats for import (public)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { folderId } = await params;

    const folder = await prisma.chatFolder.findFirst({
      where: { id: folderId, userId: user!.id },
    });
    if (!folder) throw new HttpError(404, "folder_not_found");

    const shareLink = folder.shareLink ?? crypto.randomBytes(9).toString("base64url");

    await prisma.chatFolder.update({
      where: { id: folderId },
      data: { shareLink },
    });

    return ok({ shareLink });
  } catch (err) {
    return fail(err);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const { folderId } = await params;

    const folder = await prisma.chatFolder.findUnique({
      where: { id: folderId },
      include: {
        chats: {
          include: {
            chat: {
              select: {
                id: true,
                name: true,
                type: true,
                avatarUrl: true,
                description: true,
              },
            },
          },
        },
        user: { select: { displayName: true, username: true } },
      },
    });

    if (!folder || !folder.shareLink) {
      throw new HttpError(404, "share_link_not_found");
    }

    return ok({
      folderName: folder.name,
      ownerName: folder.user.displayName,
      chats: folder.chats.map((fc) => fc.chat),
    });
  } catch (err) {
    return fail(err);
  }
}
