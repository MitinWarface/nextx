import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params;
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return ok({ members });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new HttpError(404, "not_found");

    // Only owner/admin can add members
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user!.id } },
    });
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new HttpError(403, "forbidden");
    }

    const body = await req.json();
    const { userId, role } = body as { userId: string; role?: string };
    if (!userId) throw new HttpError(400, "userId_required");

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (existing) throw new HttpError(409, "already_member");

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId, role: role ?? "member" },
    });

    return ok({ member });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const body = await req.json();
    const { userId } = body as { userId: string };

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new HttpError(404, "not_found");

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user!.id } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    // Owner/admin can remove anyone; member can remove themselves
    const targetId = userId || user!.id;
    if (targetId !== user!.id && membership.role !== "owner" && membership.role !== "admin") {
      throw new HttpError(403, "forbidden");
    }
    if (targetId === workspace.ownerId && membership.role === "owner") {
      throw new HttpError(400, "cannot_remove_owner");
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetId } },
    });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
