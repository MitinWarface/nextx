import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional(),
});

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const tags = await prisma.contactTag.findMany({
      where: { userId: me.id },
      include: { _count: { select: { mappings: true } } },
      orderBy: { name: "asc" },
    });

    return ok({ tags });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const body = await parseJson(req, postSchema);

    const existing = await prisma.contactTag.findUnique({
      where: { userId_name: { userId: me.id, name: body.name } },
    });
    if (existing) throw new HttpError(409, "tag_already_exists");

    const tag = await prisma.contactTag.create({
      data: {
        userId: me.id,
        name: body.name,
        color: body.color,
      },
    });

    return ok({ tag });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
