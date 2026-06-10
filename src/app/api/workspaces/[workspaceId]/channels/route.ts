import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params;
    const channels = await prisma.workspaceChannel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });
    return ok({ channels });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user!.id } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    const body = await req.json();
    const { name, description } = body as { name: string; description?: string };
    if (!name || name.length < 2) throw new HttpError(400, "name_too_short");

    const channel = await prisma.workspaceChannel.create({
      data: { workspaceId, name, description: description ?? null },
    });

    return created({ channel });
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
    const { channelId } = body as { channelId: string };
    if (!channelId) throw new HttpError(400, "channelId_required");

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new HttpError(404, "not_found");
    if (workspace.ownerId !== user!.id) throw new HttpError(403, "forbidden");

    await prisma.workspaceChannel.delete({ where: { id: channelId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
