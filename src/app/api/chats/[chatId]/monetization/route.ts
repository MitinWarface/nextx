import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const schema = z.object({
  isPaidChannel: z.boolean().optional(),
  subscriptionPrice: z.number().int().min(0).nullable().optional(),
  freePreviewCount: z.number().int().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { creatorId: true, type: true },
    });
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.creatorId !== me.id) throw new HttpError(403, "not_owner");
    if (chat.type !== "CHANNEL") throw new HttpError(400, "not_channel");

    const body = schema.parse(await req.json());

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

    return ok({ chat: updated });
  } catch (err) {
    return fail(err);
  }
}
