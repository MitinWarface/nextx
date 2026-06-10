/**
 * GET  /api/chats/[chatId]/subscription — get channel subscription settings
 * POST /api/chats/[chatId]/subscription — update channel subscription settings
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

const updateSchema = z.object({
  isPaidChannel: z.boolean().optional(),
  subscriptionPrice: z.number().int().min(0).nullable().optional(),
  freePreviewCount: z.number().int().min(0).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        type: true,
        creatorId: true,
        isPaidChannel: true,
        subscriptionPrice: true,
        freePreviewCount: true,
      },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "CHANNEL") throw new HttpError(400, "not_channel");
    if (chat.creatorId !== user!.id) throw new HttpError(403, "not_owner");

    return ok({
      subscription: {
        isPaidChannel: chat.isPaidChannel,
        subscriptionPrice: chat.subscriptionPrice,
        freePreviewCount: chat.freePreviewCount,
      },
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { creatorId: true, type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type !== "CHANNEL") throw new HttpError(400, "not_channel");
    if (chat.creatorId !== user!.id) throw new HttpError(403, "not_owner");

    const body = updateSchema.parse(await req.json());

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: {
        ...(body.isPaidChannel !== undefined && { isPaidChannel: body.isPaidChannel }),
        ...(body.subscriptionPrice !== undefined && { subscriptionPrice: body.subscriptionPrice }),
        ...(body.freePreviewCount !== undefined && { freePreviewCount: body.freePreviewCount }),
      },
      select: {
        id: true,
        isPaidChannel: true,
        subscriptionPrice: true,
        freePreviewCount: true,
      },
    });

    return ok({ subscription: updated });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
