/**
 * PATCH /api/users/me/message-collections/[collectionId] — rename collection
 * DELETE /api/users/me/message-collections/[collectionId] — delete collection
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().max(10).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { collectionId } = await params;
    const collection = await prisma.messageCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== user!.id) {
      throw new HttpError(404, "collection_not_found");
    }

    const body = await parseJson(req, updateSchema);
    const updated = await prisma.messageCollection.update({
      where: { id: collectionId },
      data: body,
    });

    return ok({ collection: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { collectionId } = await params;
    const collection = await prisma.messageCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== user!.id) {
      throw new HttpError(404, "collection_not_found");
    }

    await prisma.messageCollection.delete({
      where: { id: collectionId },
    });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}