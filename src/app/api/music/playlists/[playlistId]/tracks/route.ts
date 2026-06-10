import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
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

    const body = await req.json();
    const { trackId } = body as { trackId: string };

    if (!trackId) throw new HttpError(400, "trackId_required");

    const track = await prisma.musicTrack.findUnique({
      where: { id: trackId },
      select: { id: true },
    });
    if (!track) throw new HttpError(404, "track_not_found");

    const existing = await prisma.musicPlaylistTrack.findUnique({
      where: { playlistId_trackId: { playlistId, trackId } },
    });
    if (existing) throw new HttpError(400, "track_already_in_playlist");

    const maxPosition = await prisma.musicPlaylistTrack.aggregate({
      where: { playlistId },
      _max: { position: true },
    });

    const playlistTrack = await prisma.musicPlaylistTrack.create({
      data: {
        playlistId,
        trackId,
        position: (maxPosition._max.position ?? -1) + 1,
      },
      select: {
        id: true,
        position: true,
        track: {
          select: { id: true, title: true, artist: true, fileId: true, duration: true },
        },
      },
    });

    return ok({ playlistTrack });
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

    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    if (!trackId) throw new HttpError(400, "trackId_required");

    await prisma.musicPlaylistTrack.deleteMany({
      where: { playlistId, trackId },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
