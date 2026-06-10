/**
 * POST /api/bots/:botId/webhook — set webhook URL
 * DELETE /api/bots/:botId/webhook — remove webhook
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { botId } = await params;
    const body = await req.json();
    const webhookUrl = (body.webhookUrl ?? "").trim();

    if (!webhookUrl) {
      throw new HttpError(400, "webhookUrl_required");
    }

    // Verify bot ownership
    const bot = await prisma.bot.findFirst({
      where: { id: botId, creatorId: user!.id },
    });
    if (!bot) throw new HttpError(404, "bot_not_found");

    // Update webhook on bot user record
    await prisma.user!.update({
      where: { username: bot.username },
      data: { webhookUrl },
    });

    await prisma.bot.update({
      where: { id: botId },
      data: { webhookUrl },
    });

    return ok({ ok: true, webhookUrl });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { botId } = await params;

    const bot = await prisma.bot.findFirst({
      where: { id: botId, creatorId: user!.id },
    });
    if (!bot) throw new HttpError(404, "bot_not_found");

    await prisma.user!.update({
      where: { username: bot.username },
      data: { webhookUrl: null },
    });

    await prisma.bot.update({
      where: { id: botId },
      data: { webhookUrl: null },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
