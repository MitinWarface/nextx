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
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "50"));
    const search = searchParams.get("search") ?? "";
    const tab = searchParams.get("tab") ?? "my";

    const where: any = {};
    if (tab === "my") {
      where.userId = user.id;
    } else if (tab === "public") {
      where.isPublic = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { artist: { contains: search, mode: "insensitive" } },
      ];
    }

    const [tracks, total] = await Promise.all([
      prisma.musicTrack.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          artist: true,
          fileId: true,
          duration: true,
          coverId: true,
          createdAt: true,
          user: { select: { id: true, username: true, displayName: true } },
        },
      }),
      prisma.musicTrack.count({ where }),
    ]);

    return ok({ tracks, total, page, limit });
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
    const { title, artist, fileId, duration, coverId } = body as {
      title: string;
      artist?: string;
      fileId: string;
      duration?: number;
      coverId?: string;
    };

    if (!title || !fileId) {
      throw new HttpError(400, "title_and_fileId_required");
    }

    const track = await prisma.musicTrack.create({
      data: {
        userId: user.id,
        title: title.trim(),
        artist: artist?.trim() || null,
        fileId,
        duration: duration ?? null,
        coverId: coverId ?? null,
      },
      select: {
        id: true,
        title: true,
        artist: true,
        fileId: true,
        duration: true,
        coverId: true,
        createdAt: true,
      },
    });

    return created({ track });
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
    const trackId = searchParams.get("trackId");
    if (!trackId) throw new HttpError(400, "trackId_required");

    const track = await prisma.musicTrack.findUnique({
      where: { id: trackId },
      select: { id: true, userId: true },
    });
    if (!track) throw new HttpError(404, "track_not_found");
    if (track.userId !== user.id) throw new HttpError(403, "not_owner");

    await prisma.musicTrack.delete({ where: { id: trackId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
