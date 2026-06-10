import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const me = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    if (!me) throw new HttpError(401, "unauthorized");
    const { userId } = await ctx.params;
    if (me.id === userId) return ok({ isBlocked: false });
    const c = await prisma.contact.findUnique({
      where: { ownerId_targetId: { ownerId: me.id, targetId: userId } },
      select: { isBlocked: true },
    });
    return ok({ isBlocked: c?.isBlocked ?? false });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const me = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    if (!me) throw new HttpError(401, "unauthorized");
    const { userId } = await ctx.params;
    if (me.id === userId) {
      throw new HttpError(400, "Нельзя заблокировать себя");
    }
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new HttpError(404, "Пользователь не найден");
    await prisma.contact.upsert({
      where: { ownerId_targetId: { ownerId: me.id, targetId: userId } },
      create: { ownerId: me.id, targetId: userId, isBlocked: true },
      update: { isBlocked: true },
    });
    return ok({ isBlocked: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const me = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    if (!me) throw new HttpError(401, "unauthorized");
    const { userId } = await ctx.params;
    await prisma.contact.updateMany({
      where: { ownerId: me.id, targetId: userId },
      data: { isBlocked: false },
    });
    return ok({ isBlocked: false });
  } catch (err) {
    return fail(err);
  }
}
