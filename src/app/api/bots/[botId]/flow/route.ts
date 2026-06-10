/**
 * GET  /api/bots/[botId]/flow — load bot flow JSON
 * POST /api/bots/[botId]/flow — save bot flow JSON
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

async function ensureBotOwnership(botId: string, userId: string) {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    select: { id: true, creatorId: true },
  });
  if (!bot) throw new HttpError(404, "bot_not_found");
  if (bot.creatorId !== userId) throw new HttpError(403, "forbidden");
  return bot;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { botId } = await params;
    await ensureBotOwnership(botId, user!.id);

    const app = await prisma.developerApp.findFirst({
      where: { userId: user!.id },
      select: { id: true, botFlow: true },
    });

    return ok({ flow: app?.botFlow ?? null });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { botId } = await params;
    await ensureBotOwnership(botId, user!.id);

    const body = await req.json();
    const flow = body.flow;

    if (flow !== null && flow !== undefined) {
      if (typeof flow !== "object") throw new HttpError(400, "invalid_flow");
      if (!Array.isArray(flow.nodes)) throw new HttpError(400, "flow_must_have_nodes_array");
      if (!Array.isArray(flow.edges)) throw new HttpError(400, "flow_must_have_edges_array");
    }

    let app = await prisma.developerApp.findFirst({
      where: { userId: user!.id },
      select: { id: true },
    });

    if (!app) {
      app = await prisma.developerApp.create({
        data: {
          userId: user!.id,
          name: "Bot App",
          apiKey: `flow_${Date.now()}`,
        },
        select: { id: true },
      });
    }

    const updated = await prisma.developerApp.update({
      where: { id: app.id },
      data: { botFlow: flow },
      select: { id: true, botFlow: true },
    });

    return ok({ flow: updated.botFlow });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
