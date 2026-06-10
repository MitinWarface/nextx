/**
 * POST /api/chats/[chatId]/voice-post — create a voice post
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const createSchema = z.object({
  audioFileId: z.string().min(1),
  text: z.string().optional(),
  duration: z.number().int().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    const body = await parseJson(req, createSchema);

    // Verify participant
    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: user!.id } },
      select: { id: true },
    });
    if (!participant) throw new HttpError(403, "not_a_participant");

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: user!.id,
        type: "VOICE_POST",
        content: body.text ?? null,
        mediaUrl: body.audioFileId,
        fileSize: body.duration,
      },
    });

    return ok({ message });
  } catch (err) {
    return fail(err);
  }
}
