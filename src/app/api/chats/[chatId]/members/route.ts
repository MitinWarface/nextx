import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const addSchema = z.object({
  userId: z.string().min(1),
});

// POST /api/chats/[chatId]/members  — добавить участника
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { chatId } = await params;
    const { userId } = addSchema.parse(await req.json());

    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { role: true },
    });
    if (!meP) throw new HttpError(403, "not_a_participant");
    if (meP.role !== "OWNER" && meP.role !== "ADMIN") {
      throw new HttpError(403, "not_authorized");
    }
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    const existing = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId } },
      select: { id: true },
    });
    if (existing) {
      return ok({ memberId: existing.id, alreadyMember: true });
    }
    const created = await prisma.participant.create({
      data: { chatId, userId, role: "MEMBER" },
      select: { id: true, userId: true, role: true },
    });

    // Welcome Bot: send welcome message if configured
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { id: true, type: true, welcomeMessage: true },
      });
      if (chat && chat.welcomeMessage && (chat.type === "GROUP" || chat.type === "CHANNEL")) {
        const sysMsg = await prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            type: "TEXT",
            content: chat.welcomeMessage,
            serviceType: "SYSTEM",
          },
        });

        // Emit via socket if available
        if (typeof globalThis !== "undefined" && (globalThis as any).__ioInstance) {
          (globalThis as any).__ioInstance.to(`chat:${chatId}`).emit("message:new", {
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
      // Non-critical — don't fail member addition if welcome bot fails
    }

    return ok({ member: created });
  } catch (err) {
    return fail(err);
  }
}
