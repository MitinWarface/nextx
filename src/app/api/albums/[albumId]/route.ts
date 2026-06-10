import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";
import crypto from "crypto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ albumId: string }> }) {
  try {
    const { albumId } = await params;
    const album = await prisma.privateAlbum.findUnique({
      where: { id: albumId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        media: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!album) throw new HttpError(404, "not_found");

    // Check access: owner or public
    const user = await getCurrentUser();
    if (album.userId !== user?.id && !album.isPublic) {
      throw new HttpError(403, "forbidden");
    }

    return ok({ album });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ albumId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { albumId } = await params;
    const album = await prisma.privateAlbum.findUnique({ where: { id: albumId } });
    if (!album) throw new HttpError(404, "not_found");
    if (album.userId !== user!.id) throw new HttpError(403, "forbidden");

    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.isPublic !== undefined) data.isPublic = body.isPublic;
    if (body.generateShareToken) {
      data.shareToken = crypto.randomBytes(16).toString("hex");
      data.isPublic = true;
    }

    const updated = await prisma.privateAlbum.update({ where: { id: albumId }, data });
    return ok({ album: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ albumId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { albumId } = await params;
    const album = await prisma.privateAlbum.findUnique({ where: { id: albumId } });
    if (!album) throw new HttpError(404, "not_found");
    if (album.userId !== user!.id) throw new HttpError(403, "forbidden");

    await prisma.privateAlbum.delete({ where: { id: albumId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
