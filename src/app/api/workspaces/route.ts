import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: user!.id },
          { members: { some: { userId: user!.id } } },
        ],
      },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { members: true, channels: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ workspaces });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json();
    const { name, description, icon } = body as { name: string; description?: string; icon?: string };
    if (!name || name.length < 2) throw new HttpError(400, "name_too_short");

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name,
          description: description ?? null,
          icon: icon ?? null,
          ownerId: user!.id,
        },
      });

      await tx.workspaceMember.create({
        data: { workspaceId: ws.id, userId: user!.id, role: "owner" },
      });

      return ws;
    });

    return created({ workspace });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
