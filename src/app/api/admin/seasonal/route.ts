import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson } from "@/lib/api-helpers";
import { requireAdmin, logAudit } from "@/lib/admin-auth";

const createEventSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional().default(""),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  theme: z
    .object({
      colors: z.array(z.string()).optional(),
      icon: z.string().max(10).optional(),
      background: z.string().url().optional(),
    })
    .nullable()
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const events = await prisma.seasonalEvent.findMany({
      orderBy: { startsAt: "desc" },
    });
    return ok({ events });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await parseJson(req, createEventSchema);

    const event = await prisma.seasonalEvent.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description ?? "",
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        theme: body.theme ?? undefined,
      },
    });

    await logAudit(admin.id, "SETTINGS_CHANGE", `seasonal:${event.id}`, {
      action: "create",
      code: event.code,
    });

    return ok({ event });
  } catch (err) {
    return fail(err);
  }
}
