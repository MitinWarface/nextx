import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ stickerId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { stickerId } = await ctx.params;
    const sticker = await prisma.sticker.findUnique({
      where: { id: stickerId },
      select: { ownerId: true },
    });
    if (!sticker) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (sticker.ownerId !== me.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await prisma.sticker.delete({ where: { id: stickerId } });
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
