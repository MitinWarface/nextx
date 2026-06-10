import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  chatId: z.string().min(1),
  answers: z.array(z.string()).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!p || (p.role !== "OWNER" && p.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const requests = await prisma.joinRequest.findMany({
      where: { chatId, status: "pending" },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok({ requests });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, postSchema);

    const chat = await prisma.chat.findUnique({
      where: { id: body.chatId },
      select: { id: true, type: true, joinQuestions: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "GROUP") throw new HttpError(400, "not_a_group");

    const existing = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: body.chatId, userId: me.id } },
      select: { id: true },
    });
    if (existing) throw new HttpError(400, "already_a_participant");

    const existingRequest = await prisma.joinRequest.findUnique({
      where: { chatId_userId: { chatId: body.chatId, userId: me.id } },
      select: { id: true, status: true },
    });
    if (existingRequest && existingRequest.status === "pending") {
      throw new HttpError(409, "request_already_pending");
    }

    const request = await prisma.joinRequest.upsert({
      where: { chatId_userId: { chatId: body.chatId, userId: me.id } },
      create: {
        chatId: body.chatId,
        userId: me.id,
        answers: body.answers ?? [],
        status: "pending",
      },
      update: {
        answers: body.answers ?? [],
        status: "pending",
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return ok({ request });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, patchSchema);

    const joinReq = await prisma.joinRequest.findUnique({
      where: { id: body.id },
      select: { id: true, chatId: true, userId: true, status: true },
    });
    if (!joinReq) throw new HttpError(404, "request_not_found");
    if (joinReq.status !== "pending") throw new HttpError(400, "already_processed");

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: joinReq.chatId, userId: me.id } },
      select: { role: true },
    });
    if (!p || (p.role !== "OWNER" && p.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    const updated = await prisma.joinRequest.update({
      where: { id: body.id },
      data: { status: body.status },
    });

    if (body.status === "approved") {
      await prisma.participant.create({
        data: {
          chatId: joinReq.chatId,
          userId: joinReq.userId,
          role: "MEMBER",
        },
      });

      // Welcome Bot: send welcome message if configured
      try {
        const chat = await prisma.chat.findUnique({
          where: { id: joinReq.chatId },
          select: { id: true, type: true, welcomeMessage: true },
        });
        if (chat && chat.welcomeMessage && (chat.type === "GROUP" || chat.type === "CHANNEL")) {
          const sysMsg = await prisma.message.create({
            data: {
              chatId: joinReq.chatId,
              senderId: joinReq.userId,
              type: "TEXT",
              content: chat.welcomeMessage,
              serviceType: "SYSTEM",
            },
          });

          if (typeof globalThis !== "undefined" && (globalThis as any).__ioInstance) {
            (globalThis as any).__ioInstance.to(`chat:${joinReq.chatId}`).emit("message:new", {
              id: sysMsg.id,
              chatId: sysMsg.chatId,
              senderId: sysMsg.senderId,
              type: sysMsg.type,
              content: sysMsg.content,
              serviceType: sysMsg.serviceType,
              createdAt: sysMsg.createdAt,
            });
          }
        }
      } catch {
        // Non-critical
      }
    }

    return ok({ request: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, deleteSchema);

    const joinReq = await prisma.joinRequest.findUnique({
      where: { id: body.id },
      select: { id: true, chatId: true, userId: true },
    });
    if (!joinReq) throw new HttpError(404, "request_not_found");

    if (joinReq.userId === me.id) {
      await prisma.joinRequest.delete({ where: { id: body.id } });
      return ok({ deleted: true });
    }

    const p = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: joinReq.chatId, userId: me.id } },
      select: { role: true },
    });
    if (!p || (p.role !== "OWNER" && p.role !== "ADMIN")) {
      throw new HttpError(403, "not_authorized");
    }

    await prisma.joinRequest.delete({ where: { id: body.id } });
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
