/**
 * GET  /api/countdowns — list countdowns
 * POST /api/countdowns — create countdown
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, requireUser } from "@/lib/api-helpers";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  targetAt: z.string().datetime(),
  chatId: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");

    const countdowns = await prisma.countdown.findMany({
      where: {
        ...(chatId ? { chatId } : { userId: user!.id }),
      },
      orderBy: { targetAt: "asc" },
    });

    return ok({ countdowns });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, createSchema);

    const countdown = await prisma.countdown.create({
      data: {
        userId: user!.id,
        title: body.title,
        targetAt: new Date(body.targetAt),
        chatId: body.chatId ?? null,
        color: body.color ?? null,
      },
    });

    return ok({ countdown });
  } catch (err) {
    return fail(err);
  }
}
