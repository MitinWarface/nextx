import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  shortcut: z.string().min(1).max(50),
  content: z.string().min(1).max(2000),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const quickReplies = await prisma.quickReply.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
    });

    return ok({ quickReplies });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, postSchema);

    const existing = await prisma.quickReply.findUnique({
      where: { userId_shortcut: { userId: me.id, shortcut: body.shortcut } },
    });
    if (existing) throw new HttpError(409, "shortcut_already_exists");

    const quickReply = await prisma.quickReply.create({
      data: {
        userId: me.id,
        shortcut: body.shortcut,
        content: body.content,
      },
    });

    return ok({ quickReply });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, deleteSchema);

    const qr = await prisma.quickReply.findUnique({
      where: { id: body.id },
      select: { id: true, userId: true },
    });
    if (!qr || qr.userId !== me.id) throw new HttpError(404, "not_found");

    await prisma.quickReply.delete({ where: { id: body.id } });

    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
