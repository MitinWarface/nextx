import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
        channels: true,
        projects: { include: { tasks: true } },
        _count: { select: { members: true, channels: true, projects: true } },
      },
    });
    if (!workspace) throw new HttpError(404, "not_found");

    const isMember = workspace.ownerId === user!.id || workspace.members.some((m) => m.userId === user!.id);
    if (!isMember) throw new HttpError(403, "not_a_member");

    return ok({ workspace });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new HttpError(404, "not_found");
    if (workspace.ownerId !== user!.id) throw new HttpError(403, "forbidden");

    const body = await req.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.icon !== undefined) data.icon = body.icon;

    const updated = await prisma.workspace.update({ where: { id: workspaceId }, data });
    return ok({ workspace: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new HttpError(404, "not_found");
    if (workspace.ownerId !== user!.id) throw new HttpError(403, "forbidden");

    await prisma.workspace.delete({ where: { id: workspaceId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
