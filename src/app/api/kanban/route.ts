import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const chatId = req.nextUrl.searchParams.get("chatId");
    if (!chatId) throw new HttpError(400, "chatId required");

    const tasks = await prisma.kanbanTask.findMany({
      where: { chatId },
      orderBy: [{ column: "asc" }, { position: "asc" }],
    });

    return ok({ tasks });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const { chatId, title, description, column, assigneeId, dueDate } = body;
    if (!chatId || !title) throw new HttpError(400, "chatId and title required");

    const maxPos = await prisma.kanbanTask.findFirst({
      where: { chatId, column: column ?? "todo" },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const task = await prisma.kanbanTask.create({
      data: {
        chatId,
        title,
        description,
        column: column ?? "todo",
        position: (maxPos?.position ?? -1) + 1,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return ok({ task });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
