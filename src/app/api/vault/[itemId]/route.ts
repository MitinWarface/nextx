/**
 * PATCH /api/vault/[itemId]   — update vault item
 * DELETE /api/vault/[itemId]  — delete vault item
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  metadata: z.any().optional(),
  folder: z.string().max(100).optional(),
  isFavorite: z.boolean().optional(),
  type: z.enum(["password", "note", "document", "seed_phrase", "card"]).optional(),
});

async function verifyOwner(itemId: string, userId: string) {
  const item = await prisma.vaultItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== userId) throw new HttpError(404, "not_found");
  return item;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { itemId } = await params;
    await verifyOwner(itemId, user!.id);

    const body = await parseJson(req, updateSchema);
    const updated = await prisma.vaultItem.update({
      where: { id: itemId },
      data: body,
    });

    return ok({ item: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { itemId } = await params;
    await verifyOwner(itemId, user!.id);

    await prisma.vaultItem.delete({ where: { id: itemId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}
