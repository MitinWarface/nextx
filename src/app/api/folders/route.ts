/**
 * GET  /api/folders       — список папок текущего пользователя
 * POST /api/folders       — создать папку
 * PUT  /api/folders/:id   — переименовать / изменить порядок
 * DELETE /api/folders/:id — удалить папку
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const folders = await prisma.chatFolder.findMany({
      where: { userId: user!.id },
      orderBy: { sortOrder: "asc" },
      include: {
        chats: {
          include: { chat: { select: { id: true } } },
        },
      },
    });
    return ok({
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        icon: f.icon,
        sortOrder: f.sortOrder,
        chatIds: f.chats.map((fc) => fc.chat.id),
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
    const body = await req.json();
    const name = (body.name ?? "").trim();
    if (!name) throw new HttpError(400, "name_required");

    const maxOrder = await prisma.chatFolder.aggregate({
      where: { userId: user!.id },
      _max: { sortOrder: true },
    });

    const folder = await prisma.chatFolder.create({
      data: {
        userId: user!.id,
        name,
        icon: body.icon ?? "Folder",
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    const chatTypes = Array.isArray(body.chatTypes) ? body.chatTypes : [];
    if (chatTypes.length > 0) {
      await prisma.chatFolder.update({
        where: { id: folder.id },
        data: { name: folder.name },
      });
    }

    return ok({ folder });
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new HttpError(409, "folder_name_exists");
    }
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
