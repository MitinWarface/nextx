/**
 * POST /api/sticker-packs/[packId]/stickers — add sticker to pack
 * DELETE /api/sticker-packs/[packId]/stickers — remove sticker from pack
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const addStickerSchema = z.object({
  mediaUrl: z.string().min(1),
  emoji: z.string().max(4).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { packId } = await params;

    const pack = await prisma.stickerPack.findUnique({ where: { id: packId } });
    if (!pack) throw new HttpError(404, "pack_not_found");
    if (pack.authorId !== user!.id) throw new HttpError(403, "not_author");

    const body = await parseJson(req, addStickerSchema);

    const sticker = await prisma.sticker.create({
      data: {
        ownerId: user!.id,
        mediaUrl: body.mediaUrl,
        emoji: body.emoji,
        packId,
      },
    });

    return ok({ sticker });
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { packId } = await params;

    const pack = await prisma.stickerPack.findUnique({ where: { id: packId } });
    if (!pack) throw new HttpError(404, "pack_not_found");
    if (pack.authorId !== user!.id) throw new HttpError(403, "not_author");

    const body = await req.json();
    const { stickerId } = body as { stickerId?: string };
    if (!stickerId) throw new HttpError(400, "stickerId_required");

    const sticker = await prisma.sticker.findUnique({ where: { id: stickerId } });
    if (!sticker || sticker.packId !== packId) throw new HttpError(404, "sticker_not_found");

    await prisma.sticker.delete({ where: { id: stickerId } });

    return ok({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    return fail(err);
  }
}
