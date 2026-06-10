import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const album = await prisma.privateAlbum.findUnique({
      where: { shareToken: token },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        media: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!album) throw new HttpError(404, "not_found");
    if (!album.isPublic) throw new HttpError(403, "album_not_public");

    return ok({ album });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
