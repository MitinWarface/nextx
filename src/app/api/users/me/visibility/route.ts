/**
 * GET  /api/users/me/visibility — list all visibility settings
 * POST /api/users/me/visibility — set a visibility setting
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const VALID_SETTINGS = ["online", "typing", "read_receipts", "last_seen"] as const;
const VALID_VALUES = ["visible", "hidden"] as const;

const postSchema = z.object({
  targetId: z.string().min(1), // "all", "contacts", "nobody", or a specific userId
  setting: z.enum(VALID_SETTINGS),
  value: z.enum(VALID_VALUES),
});

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const settings = await prisma.visibilitySetting.findMany({
      where: { userId: user!.id },
      include: {
        target: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { setting: "asc" },
    });

    return ok({
      settings: settings.map((s) => ({
        id: s.id,
        targetId: s.targetId,
        setting: s.setting,
        value: s.value,
        target: s.target,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await parseJson(req, postSchema);
    const { targetId, setting, value } = body;

    // Upsert the visibility setting
    const existing = await prisma.visibilitySetting.findUnique({
      where: { userId_targetId_setting: { userId: user!.id, targetId, setting } },
    });

    if (existing) {
      const updated = await prisma.visibilitySetting.update({
        where: { id: existing.id },
        data: { value },
      });
      return ok({ setting: updated });
    }

    const created = await prisma.visibilitySetting.create({
      data: {
        userId: user!.id,
        targetId,
        setting,
        value,
      },
    });

    return ok({ setting: created });
  } catch (err) {
    return fail(err);
  }
}
