/**
 * GET  /api/users/me/profiles — list user profiles
 * POST /api/users/me/profiles — create profile
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, parseJson, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  avatarUrl: z.string().max(500).nullable().optional(),
  about: z.string().max(500).nullable().optional(),
  statusEmoji: z.string().max(4).nullable().optional(),
  statusText: z.string().max(64).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const profiles = await prisma.userProfile.findMany({
      where: { userId: user!.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return ok({ profiles });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(req, createSchema);
    const count = await prisma.userProfile.count({ where: { userId: user!.id } });
    const isFirst = count === 0;

    const profile = await prisma.userProfile.create({
      data: {
        userId: user!.id,
        name: body.name,
        avatarUrl: body.avatarUrl ?? undefined,
        about: body.about ?? undefined,
        statusEmoji: body.statusEmoji ?? undefined,
        statusText: body.statusText ?? undefined,
        isDefault: isFirst,
      },
    });

    return created({ profile });
  } catch (err) {
    return fail(err);
  }
}
