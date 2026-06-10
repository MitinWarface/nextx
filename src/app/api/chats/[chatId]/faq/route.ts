import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  sortOrder: z.number().int().min(0).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { id: true },
    });
    if (!p) throw new HttpError(403, "not_a_participant");

    const faqs = await prisma.groupFaq.findMany({
      where: { chatId },
      orderBy: { sortOrder: "asc" },
    });

    return ok({ faqs });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;
    const body = await parseJson(req, postSchema);

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "GROUP") throw new HttpError(400, "not_a_group");

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!p || (p.role !== "OWNER" && p.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const faq = await prisma.groupFaq.create({
      data: {
        chatId,
        question: body.question,
        answer: body.answer,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return ok({ faq });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;
    const body = await parseJson(req, deleteSchema);

    const faq = await prisma.groupFaq.findUnique({
      where: { id: body.id },
      select: { id: true, chatId: true },
    });
    if (!faq || faq.chatId !== chatId) throw new HttpError(404, "faq_not_found");

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!p || (p.role !== "OWNER" && p.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    await prisma.groupFaq.delete({ where: { id: body.id } });

    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
