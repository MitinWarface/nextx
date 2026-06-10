import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, noContent, parseJson, HttpError } from "@/lib/api-helpers";

const bodySchema = z.object({
  targetId: z.string().min(1),
});

async function getOwnedTag(tagId: string, userId: string) {
  const tag = await prisma.contactTag.findUnique({ where: { id: tagId } });
  if (!tag || tag.userId !== userId) throw new HttpError(404, "not_found");
  return tag;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { tagId } = await params;
    await getOwnedTag(tagId, me.id);

    const mappings = await prisma.contactTagMapping.findMany({
      where: { tagId },
      include: {
        tag: true,
      },
    });

    const targetIds = mappings.map((m) => m.targetId);
    const users = await prisma.user.findMany({
      where: { id: { in: targetIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
      },
    });

    return ok({ contacts: users });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { tagId } = await params;
    await getOwnedTag(tagId, me.id);
    const body = await parseJson(req, bodySchema);

    const user = await prisma.user.findUnique({ where: { id: body.targetId } });
    if (!user) throw new HttpError(404, "user_not_found");

    const existing = await prisma.contactTagMapping.findUnique({
      where: { tagId_targetId: { tagId, targetId: body.targetId } },
    });
    if (existing) throw new HttpError(409, "already_tagged");

    await prisma.contactTagMapping.create({
      data: { tagId, targetId: body.targetId },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { tagId } = await params;
    await getOwnedTag(tagId, me.id);
    const body = await parseJson(req, bodySchema);

    await prisma.contactTagMapping.deleteMany({
      where: { tagId, targetId: body.targetId },
    });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
