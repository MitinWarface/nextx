/**
 * POST /api/bots/[botId]/webhook-incoming — external service sends updates to bot
 * Auth: bot token (Telegram Bot API pattern)
 * Rate limited: 100 req/min per bot
 */
import type { NextRequest } from "next/server";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { handleBotWebhook } from "@/services/bot-service";
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

    // Rate limit: 100 req/min per bot token
    const rl = await checkRateLimit(`bot-webhook:${botToken}`, { windowMs: 60_000, max: 100, keyPrefix: "rl-bot-wh" });
    if (!rl.allowed) {
      throw new HttpError(429, "rate_limit_exceeded");
    }

    const body = await req.json();

    const chatId = body.message?.chat?.id ?? body.chatId;
    const message = body.message?.text ?? body.text;
    const userId = body.message?.from?.id ?? body.userId;

    if (!chatId || !message) {
      throw new HttpError(400, "invalid_update");
    }

    await handleBotWebhook(botToken, {
      chatId: String(chatId),
      message: String(message),
      userId: String(userId),
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
