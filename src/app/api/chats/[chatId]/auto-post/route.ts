import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  type: z.enum(["RSS", "YOUTUBE"]),
  url: z.string().url().max(2000),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { chatId } = await params;

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
      select: { id: true },
    });
    if (!meP) throw new HttpError(403, "not_a_participant");

    const sources = await prisma.autoPostSource.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
    });
    return ok({ sources });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { chatId } = await params;
    const body = await parseJson(req, postSchema);

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
      select: { role: true },
    });
    if (!meP || (meP.role !== "OWNER" && meP.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const source = await prisma.autoPostSource.create({
      data: {
        chatId,
        userId: user!.id,
        type: body.type,
        url: body.url,
      },
    });

    return ok({ source });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { chatId } = await params;
    const body = await parseJson(
      req,
      z.object({ id: z.string().min(1) }),
    );

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
      select: { role: true },
    });
    if (!meP || (meP.role !== "OWNER" && meP.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const source = await prisma.autoPostSource.findUnique({
      where: { id: body.id },
    });
    if (!source || source.chatId !== chatId) {
      throw new HttpError(404, "source_not_found");
    }

    await prisma.autoPostSource.delete({ where: { id: body.id } });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
