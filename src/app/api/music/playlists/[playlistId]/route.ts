import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { playlistId } = await params;

    const playlist = await prisma.musicPlaylist.findUnique({
      where: { id: playlistId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
        user: { select: { id: true, username: true, displayName: true } },
        tracks: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            position: true,
            track: {
              select: {
                id: true,
                title: true,
                artist: true,
                fileId: true,
                duration: true,
                coverId: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!playlist) throw new HttpError(404, "playlist_not_found");

    return ok({ playlist });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { playlistId } = await params;

    const playlist = await prisma.musicPlaylist.findUnique({
      where: { id: playlistId },
      select: { id: true, userId: true },
    });
    if (!playlist) throw new HttpError(404, "playlist_not_found");
    if (playlist.userId !== user.id) throw new HttpError(403, "not_owner");

    await prisma.musicPlaylist.delete({ where: { id: playlistId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
