/**
 * GET  /api/vault       — list vault items
 * POST /api/vault       — create vault item
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  type: z.enum(["password", "note", "document", "seed_phrase", "card"]),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  metadata: z.any().optional(),
  folder: z.string().max(100).default("default"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const folder = searchParams.get("folder");
    const q = searchParams.get("q");

    const where: Record<string, unknown> = { userId: user!.id };
    if (type) where.type = type;
    if (folder) where.folder = folder;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ];
    }

    const items = await prisma.vaultItem.findMany({
      where,
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    });

    return ok({ items });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(req, createSchema);
    const item = await prisma.vaultItem.create({
      data: {
        userId: user!.id,
        type: body.type,
        title: body.title,
        content: body.content,
        metadata: body.metadata ?? undefined,
        folder: body.folder,
      },
    });

    return created({ item });
  } catch (err) {
    return fail(err);
  }
}
