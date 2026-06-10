import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { workspaceId } = await params;
    const projects = await prisma.workspaceProject.findMany({
      where: { workspaceId },
      include: { tasks: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ projects });
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
    const { name, description, dueDate } = body as { name: string; description?: string; dueDate?: string };
    if (!name || name.length < 2) throw new HttpError(400, "name_too_short");

    const project = await prisma.workspaceProject.create({
      data: {
        workspaceId,
        name,
        description: description ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return created({ project });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { workspaceId } = await params;
    const body = await req.json();
    const { projectId, status, taskAction, taskId, taskTitle, assigneeId } = body as {
      projectId?: string;
      status?: string;
      taskAction?: "create" | "update" | "delete";
      taskId?: string;
      taskTitle?: string;
      assigneeId?: string;
    };

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user!.id } },
    });
    if (!membership) throw new HttpError(403, "not_a_member");

    if (taskAction === "create" && projectId && taskTitle) {
      const task = await prisma.projectTask.create({
        data: { projectId, title: taskTitle, assigneeId: assigneeId ?? null },
      });
      return ok({ task });
    }

    if (taskAction === "update" && taskId) {
      const data: any = {};
      if (body.taskStatus !== undefined) data.status = body.taskStatus;
      if (body.taskTitle !== undefined) data.title = body.taskTitle;
      if (assigneeId !== undefined) data.assigneeId = assigneeId;
      const task = await prisma.projectTask.update({ where: { id: taskId }, data });
      return ok({ task });
    }

    if (taskAction === "delete" && taskId) {
      await prisma.projectTask.delete({ where: { id: taskId } });
      return ok({ ok: true });
    }

    if (projectId && status) {
      const project = await prisma.workspaceProject.update({
        where: { id: projectId },
        data: { status },
      });
      return ok({ project });
    }

    throw new HttpError(400, "invalid_request");
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
