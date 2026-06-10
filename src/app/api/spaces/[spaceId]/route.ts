import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const cookieHeader = _req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { spaceId } = await params;

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        isPublic: true,
        createdAt: true,
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        channels: {
          select: {
            id: true,
            name: true,
            type: true,
            position: true,
          },
          orderBy: { position: "asc" },
        },
        _count: { select: { members: true } },
      },
    });

    if (!space) throw new HttpError(404, "space_not_found");

    const isMember = space.members.some((m) => m.user.id === user.id);
    if (!space.isPublic && !isMember) {
      throw new HttpError(403, "not_a_member");
    }

    return ok({ space });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { spaceId } = await params;

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { id: true, ownerId: true },
    });
    if (!space) throw new HttpError(404, "space_not_found");
    if (space.ownerId !== user.id) throw new HttpError(403, "not_owner");

    const body = await req.json();
    const { name, description, icon, isPublic } = body as {
      name?: string;
      description?: string;
      icon?: string;
      isPublic?: boolean;
    };

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (icon !== undefined) updates.icon = icon || null;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_updates");
    }

    const updated = await prisma.space.update({
      where: { id: spaceId },
      data: updates,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        isPublic: true,
      },
    });

    return ok({ space: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { spaceId } = await params;

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      select: { id: true, ownerId: true },
    });
    if (!space) throw new HttpError(404, "space_not_found");
    if (space.ownerId !== user.id) throw new HttpError(403, "not_owner");

    await prisma.space.delete({ where: { id: spaceId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
