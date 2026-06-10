import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ albumId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { albumId } = await params;
    const album = await prisma.privateAlbum.findUnique({ where: { id: albumId } });
    if (!album) throw new HttpError(404, "not_found");
    if (album.userId !== user!.id) throw new HttpError(403, "forbidden");

    const body = await req.json();
    const { fileId, caption } = body as { fileId: string; caption?: string };
    if (!fileId) throw new HttpError(400, "fileId_required");

    // Get max sortOrder
    const maxOrder = await prisma.albumMedia.aggregate({
      where: { albumId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const media = await prisma.albumMedia.create({
      data: { albumId, fileId, caption: caption ?? null, sortOrder: nextOrder },
    });

    return ok({ media });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ albumId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { albumId } = await params;
    const album = await prisma.privateAlbum.findUnique({ where: { id: albumId } });
    if (!album) throw new HttpError(404, "not_found");
    if (album.userId !== user!.id) throw new HttpError(403, "forbidden");

    const body = await req.json();
    const { mediaId } = body as { mediaId: string };
    if (!mediaId) throw new HttpError(400, "mediaId_required");

    await prisma.albumMedia.delete({ where: { id: mediaId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
