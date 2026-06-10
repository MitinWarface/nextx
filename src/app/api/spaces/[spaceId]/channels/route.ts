import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, created, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { spaceId } = await params;

    const member = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
    });
    if (!member) throw new HttpError(403, "not_a_member");

    const channels = await prisma.spaceChannel.findMany({
      where: { spaceId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        position: true,
        createdAt: true,
      },
    });

    return ok({ channels });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { spaceId } = await params;

    const member = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member || (member.role !== "owner" && member.role !== "admin" && member.role !== "moderator")) {
      throw new HttpError(403, "not_authorized_to_create_channels");
    }

    const body = await req.json();
    const { name, type } = body as { name: string; type?: string };

    if (!name || name.trim().length === 0) {
      throw new HttpError(400, "name_required");
    }

    const maxPosition = await prisma.spaceChannel.aggregate({
      where: { spaceId },
      _max: { position: true },
    });

    const channel = await prisma.spaceChannel.create({
      data: {
        spaceId,
        name: name.trim(),
        type: type ?? "text",
        position: (maxPosition._max.position ?? -1) + 1,
      },
      select: {
        id: true,
        name: true,
        type: true,
        position: true,
        createdAt: true,
      },
    });

    return created({ channel });
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

    const member = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "not_authorized");
    }

    const body = await req.json();
    const { channelId, name, type, position } = body as {
      channelId: string;
      name?: string;
      type?: string;
      position?: number;
    };

    if (!channelId) throw new HttpError(400, "channelId_required");

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if (position !== undefined) updates.position = position;

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_updates");
    }

    const updated = await prisma.spaceChannel.update({
      where: { id: channelId },
      data: updates,
      select: { id: true, name: true, type: true, position: true },
    });

    return ok({ channel: updated });
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
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) throw new HttpError(400, "channelId_required");

    const member = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "not_authorized");
    }

    await prisma.spaceChannel.delete({ where: { id: channelId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
