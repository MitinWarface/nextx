import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const patchSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

interface RouteContext {
  params: Promise<{ chatId: string; userId: string }>;
}

// PATCH /api/chats/[chatId]/members/[userId]  — сменить роль
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { chatId, userId } = await ctx.params;
    const { role } = patchSchema.parse(await req.json());

    // Только OWNER может менять роли
    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!meP || meP.role !== "OWNER") throw new HttpError(403, "owner_only");

    // Нельзя снять OWNER с самого себя, если он последний OWNER
    if (role !== "OWNER") {
      const owners = await prisma.participant.count({
        where: { chatId, role: "OWNER" },
      });
      if (owners <= 1 && userId === me.id) {
        throw new HttpError(400, "cannot_remove_last_owner");
      }
    }
    const updated = await prisma.participant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { role },
      select: { id: true, userId: true, role: true },
    });
    return ok({ member: updated });
  } catch (err) {
    return fail(err);
  }
}

// DELETE /api/chats/[chatId]/members/[userId]  — удалить участника
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { chatId, userId } = await ctx.params;
    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!meP) throw new HttpError(403, "not_a_participant");
    const isSelf = userId === me.id;
    if (!isSelf && meP.role !== "OWNER" && meP.role !== "ADMIN") {
      throw new HttpError(403, "not_authorized");
    }
    // Нельзя удалить последнего OWNER
    if (meP.role === "OWNER") {
      const owners = await prisma.participant.count({
        where: { chatId, role: "OWNER" },
      });
      if (owners <= 1 && !isSelf) {
        throw new HttpError(400, "cannot_remove_last_owner");
      }
    }
    await prisma.participant.delete({
      where: { chatId_userId: { chatId, userId } },
    });
    return ok({ removed: true });
  } catch (err) {
    return fail(err);
  }
}
