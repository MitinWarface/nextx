/**
 * Bot service — CRUD, webhook handling, message sending.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api-helpers";

function generateBotToken(): string {
  return `bot_${randomBytes(32).toString("hex")}`;
}

export interface CreateBotOptions {
  creatorId: string;
  name: string;
  username: string;
  description?: string;
  avatarUrl?: string;
}

export async function createBot(options: CreateBotOptions) {
  const token = generateBotToken();

  // Create bot user
  const botUser = await prisma.user.create({
    data: {
      username: options.username.toLowerCase(),
      displayName: options.name,
      email: `bot_${options.username}@nextx.local`,
      passwordHash: "", // Bots don't login
      avatarUrl: options.avatarUrl ?? null,
      bio: options.description ?? null,
      isBot: true,
      botToken: token,
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true, botToken: true },
  });

  // Create Bot record
  await prisma.bot.create({
    data: {
      creatorId: options.creatorId,
      name: options.name,
      username: options.username.toLowerCase(),
      description: options.description ?? null,
      avatarUrl: options.avatarUrl ?? null,
    },
  });

  return botUser;
}

export async function sendBotMessage(
  botToken: string,
  chatId: string,
  content: string,
  opts?: { keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>> },
) {
  const bot = await prisma.user.findFirst({
    where: { botToken, isBot: true },
    select: { id: true, isBot: true },
  });
  if (!bot) throw new HttpError(401, "invalid_bot_token");

  const member = await prisma.participant.findFirst({
    where: { chatId, userId: bot.id },
  });
  if (!member) throw new HttpError(403, "bot_not_in_chat");

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: bot.id,
      type: "TEXT",
      content,
      keyboard: opts?.keyboard ?? undefined,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  // Update chat lastMessageAt
  await prisma.chat.update({
    where: { id: chatId },
    data: { lastMessageAt: new Date() },
  });

  // Emit via socket
  const io = (globalThis as any).__ioInstance;
  if (io) {
    io.to(`chat:${chatId}`).emit("message:new", message);
  }

  return message;
}

export async function handleBotWebhook(
  botToken: string,
  update: { chatId: string; message: string; userId: string },
) {
  const bot = await prisma.user.findFirst({
    where: { botToken, isBot: true },
    select: { id: true, botToken: true },
  });
  if (!bot) throw new HttpError(401, "invalid_bot_token");

  const botUser = await prisma.user.findFirst({
    where: { id: bot.id },
    select: { username: true },
  });

  const botRecord = await prisma.bot.findFirst({
    where: { username: botUser?.username ?? "" },
    select: { webhookUrl: true },
  });

  if (!botRecord?.webhookUrl) {
    throw new HttpError(400, "no_webhook_configured");
  }

  // Forward to webhook
  try {
    const res = await fetch(botRecord.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        update_id: Date.now(),
        message: {
          chat: { id: update.chatId },
          from: { id: update.userId },
          text: update.message,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new HttpError(502, "webhook_failed");
    }

    const response = await res.json() as { text?: string; keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>> };

    if (response.text) {
      await sendBotMessage(botToken, update.chatId, response.text, {
        keyboard: response.keyboard,
      });
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // Webhook didn't respond — that's OK
  }
}
