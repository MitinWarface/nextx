import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    const event = await prisma.seasonalEvent.findFirst({
      where: {
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { startsAt: "desc" },
    });

    return ok({ event: event ?? null });
  } catch (err) {
    return fail(err);
  }
}
