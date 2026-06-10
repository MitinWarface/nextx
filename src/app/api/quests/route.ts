import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const quests = await prisma.quest.findMany({
      where: { isActive: true },
      include: {
        userQuests: { where: { userId: user!.id } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ quests });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
