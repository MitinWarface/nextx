import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, noContent, parseJson, HttpError } from "@/lib/api-helpers";

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).optional(),
});

async function getOwnedTag(tagId: string, userId: string) {
  const tag = await prisma.contactTag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== userId) throw new HttpError(404, "not_found");
  return tag;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { tagId } = await params;
    await getOwnedTag(tagId, me.id);
    const body = await parseJson(req, patchSchema);

    if (body.name) {
      const dup = await prisma.contactTag.findUnique({
        where: { userId_name: { userId: me.id, name: body.name } },
      });
      if (dup && dup.id !== tagId) throw new HttpError(409, "tag_name_taken");
    }

    const tag = await prisma.contactTag.update({
      where: { id: tagId },
      data: body,
    });

    return ok({ tag });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { tagId } = await params;
    await getOwnedTag(tagId, me.id);

    await prisma.contactTag.delete({ where: { id: tagId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
