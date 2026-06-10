import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, created, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "my";

    const where: any = {};
    if (tab === "my") {
      where.userId = user.id;
    } else if (tab === "public") {
      where.isPublic = true;
      where.userId = { not: user.id };
    }

    const playlists = await prisma.musicPlaylist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { tracks: true } },
        tracks: {
          take: 3,
          orderBy: { position: "asc" },
          select: {
            track: {
              select: { id: true, title: true, artist: true, coverId: true },
            },
          },
        },
      },
    });

    return ok({ playlists });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await req.json();
    const { name, isPublic } = body as { name: string; isPublic?: boolean };

    if (!name || name.trim().length === 0) {
      throw new HttpError(400, "name_required");
    }

    const playlist = await prisma.musicPlaylist.create({
      data: {
        userId: user.id,
        name: name.trim(),
        isPublic: isPublic ?? false,
      },
      select: {
        id: true,
        name: true,
        isPublic: true,
        createdAt: true,
      },
    });

    return created({ playlist });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await req.json();
    const { playlistId, name, isPublic } = body as {
      playlistId: string;
      name?: string;
      isPublic?: boolean;
    };

    if (!playlistId) throw new HttpError(400, "playlistId_required");

    const playlist = await prisma.musicPlaylist.findUnique({
      where: { id: playlistId },
      select: { id: true, userId: true },
    });
    if (!playlist) throw new HttpError(404, "playlist_not_found");
    if (playlist.userId !== user.id) throw new HttpError(403, "not_owner");

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (isPublic !== undefined) updates.isPublic = isPublic;

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_updates");
    }

    const updated = await prisma.musicPlaylist.update({
      where: { id: playlistId },
      data: updates,
      select: { id: true, name: true, isPublic: true },
    });

    return ok({ playlist: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { searchParams } = new URL(req.url);
    const playlistId = searchParams.get("playlistId");
    if (!playlistId) throw new HttpError(400, "playlistId_required");

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
