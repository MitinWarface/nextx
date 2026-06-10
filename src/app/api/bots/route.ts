/**
 * POST   /api/bots       — create a bot
 * GET    /api/bots       — list my bots
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";
import { createBot } from "@/services/bot-service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const bots = await prisma.bot.findMany({
      where: { creatorId: user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, username: true, displayName: true } },
      },
    });
    return ok({ bots });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const name = (body.name ?? body.displayName ?? "").trim();
    const username = (body.username ?? "").trim();

    if (!name || !username) {
      throw new HttpError(400, "name_and_username_required");
    }

    // Check username uniqueness
    const existing = await prisma.user!.findUnique({
      where: { username: username.toLowerCase() },
    });
    if (existing) {
      throw new HttpError(409, "username_taken");
    }

    const bot = await createBot({
      creatorId: user!.id,
      name,
      username,
      description: body.description,
      avatarUrl: body.avatarUrl,
    });

    return ok({ bot });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
