/**
 * POST /api/messages/bulk-delete  — удалить несколько сообщений разом
 * Body: { messageIds: string[] }
 * Удаляет только сообщения, отправленные текущим пользователем
 * (т.к. удалять чужие сообщения нельзя — пока).
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const schema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, schema);
    const result = await prisma.message.updateMany({
      where: {
        id: { in: body.messageIds },
        senderId: user!.id,
        isDeleted: false,
      },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return ok({ deleted: result.count });
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    return fail(err);
  }
}
