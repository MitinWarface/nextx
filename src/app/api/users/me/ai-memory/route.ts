import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const postSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(5000),
  expiresAt: z.string().datetime().optional(),
});

const deleteSchema = z.object({
  key: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const memories = await prisma.aiMemory.findMany({
      where: {
        userId: me.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({
      memories: memories.map((m) => ({
        id: m.id,
        key: m.key,
        value: m.value,
        expiresAt: m.expiresAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const body = postSchema.parse(await req.json());

    const memory = await prisma.aiMemory.upsert({
      where: { userId_key: { userId: me.id, key: body.key } },
      update: {
        value: body.value,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      create: {
        userId: me.id,
        key: body.key,
        value: body.value,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    return ok({
      memory: {
        id: memory.id,
        key: memory.key,
        value: memory.value,
        expiresAt: memory.expiresAt?.toISOString() ?? null,
        createdAt: memory.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const body = deleteSchema.parse(await req.json());

    await prisma.aiMemory.deleteMany({
      where: { userId: me.id, key: body.key },
    });

    return ok({ success: true });
  } catch (err) {
    return fail(err);
  }
}
