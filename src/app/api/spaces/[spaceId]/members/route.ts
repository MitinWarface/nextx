import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
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

    const member = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
      select: { role: true },
    });
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new HttpError(403, "not_authorized_to_invite");
    }

    const body = await req.json();
    const { userId, username } = body as { userId?: string; username?: string };

    let targetUserId = userId;
    if (!targetUserId && username) {
      const targetUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (!targetUser) throw new HttpError(404, "user_not_found");
      targetUserId = targetUser.id;
    }
    if (!targetUserId) throw new HttpError(400, "user_required");

    const existing = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    });
    if (existing) throw new HttpError(400, "already_member");

    const newMember = await prisma.spaceMember.create({
      data: { spaceId, userId: targetUserId, role: "member" },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return ok({ member: newMember });
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

    const body = await req.json();
    const { memberId, role } = body as { memberId: string; role: string };

    if (!memberId || !role) throw new HttpError(400, "missing_fields");

    const requesterMember = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
      select: { role: true },
    });
    if (!requesterMember || (requesterMember.role !== "owner" && requesterMember.role !== "admin")) {
      throw new HttpError(403, "not_authorized");
    }

    if (role === "owner" && space.ownerId !== user.id) {
      throw new HttpError(403, "only_owner_can_transfer");
    }

    const updated = await prisma.spaceMember.update({
      where: { id: memberId },
      data: { role },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, username: true, displayName: true } },
      },
    });

    return ok({ member: updated });
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
    const memberId = searchParams.get("memberId");
    const leave = searchParams.get("leave") === "true";

    if (leave) {
      await prisma.spaceMember.deleteMany({
        where: { spaceId, userId: user.id },
      });
      return ok({ ok: true });
    }

    if (!memberId) throw new HttpError(400, "memberId_required");

    const requesterMember = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: user.id } },
      select: { role: true },
    });
    if (!requesterMember || (requesterMember.role !== "owner" && requesterMember.role !== "admin")) {
      throw new HttpError(403, "not_authorized");
    }

    await prisma.spaceMember.delete({ where: { id: memberId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
