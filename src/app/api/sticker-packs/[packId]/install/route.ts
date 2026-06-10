import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { packId } = await params;

    const pack = await prisma.stickerPack.findUnique({
      where: { id: packId },
      select: { id: true, isPublic: true },
    });
    if (!pack) throw new HttpError(404, "pack_not_found");

    const updated = await prisma.user!.update({
      where: { id: user!.id },
      data: {
        installedStickerPackIds: {
          push: packId,
        },
      },
      select: { installedStickerPackIds: true },
    });

    return ok({ installedPackIds: updated.installedStickerPackIds });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { packId } = await params;

    const currentUser = await prisma.user!.findUnique({
      where: { id: user!.id },
      select: { installedStickerPackIds: true },
    });
    if (!currentUser) throw new HttpError(404, "user_not_found");

    const filtered = currentUser.installedStickerPackIds.filter((id) => id !== packId);

    const updated = await prisma.user!.update({
      where: { id: user!.id },
      data: { installedStickerPackIds: filtered },
      select: { installedStickerPackIds: true },
    });

    return ok({ installedPackIds: updated.installedStickerPackIds });
  } catch (err) {
    return fail(err);
  }
}
