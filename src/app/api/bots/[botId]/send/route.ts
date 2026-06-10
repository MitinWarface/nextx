/**
 * POST /api/bots/[botId]/send — bot sends a message
 * Auth: bot token (Telegram Bot API pattern — token IS the credential)
 * Rate limited: 30 req/min per bot
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { sendBotMessage } from "@/services/bot-service";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const { botId: botToken } = await params;

    if (!botToken || !botToken.startsWith("bot_")) {
      throw new HttpError(401, "invalid_bot_token");
    }

    // Rate limit: 30 messages/min per bot token
    const rl = await checkRateLimit(`bot:${botToken}`, { windowMs: 60_000, max: 30, keyPrefix: "rl-bot" });
    if (!rl.allowed) {
      throw new HttpError(429, "rate_limit_exceeded");
    }

    const body = await req.json();
    const chatId = body.chatId as string;
    const content = (body.content ?? "").trim();

    if (!chatId || !content) {
      throw new HttpError(400, "chatId_and_content_required");
    }

    if (content.length > 4096) {
      throw new HttpError(400, "message_too_long");
    }

    const message = await sendBotMessage(botToken, chatId, content, {
      keyboard: body.keyboard,
    });

    return ok({ message });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
