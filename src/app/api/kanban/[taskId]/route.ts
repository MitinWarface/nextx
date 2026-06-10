import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const { taskId } = await params;

    const task = await prisma.kanbanTask.findUnique({ where: { id: taskId } });
    if (!task) throw new HttpError(404, "not_found");

    const data: Record<string, any> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.column !== undefined) data.column = body.column;
    if (body.position !== undefined) data.position = body.position;
    if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const updated = await prisma.kanbanTask.update({ where: { id: taskId }, data });
    return ok({ task: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { taskId } = await params;
    await prisma.kanbanTask.delete({ where: { id: taskId } });
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
