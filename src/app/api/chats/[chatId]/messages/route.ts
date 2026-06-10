/**
 * GET  /api/chats/[chatId]/messages?cursor=...&limit=...
 * POST /api/chats/[chatId]/messages                  — отправить сообщение
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { listMessages, sendMessage } from "@/services/message-service";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { withUserRateLimit } from "@/lib/api-helpers/rate-limit-wrapper";
import { prisma } from "@/lib/prisma";
import { checkAndAwardAchievements } from "@/lib/achievement-checker";

const sendSchema = z.object({
  type: z
    .enum(["TEXT", "IMAGE", "VIDEO", "FILE", "AUDIO", "VOICE", "STICKER", "LOCATION", "POLL", "TASK_LIST"])
    .optional(),
  content: z.string().max(8000).optional(),
  mediaUrl: z.string().min(1).optional(),
  thumbnailUrl: z.string().min(1).optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().nonnegative().optional(),
  replyToId: z.string().optional(),
  forwardedFromId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  // Link preview
  linkTitle: z.string().optional(),
  linkDescription: z.string().optional(),
  linkImage: z.string().optional(),
  linkSiteName: z.string().optional(),
  linkUrl: z.string().optional(),
  // Inline keyboard
  keyboard: z
    .array(
      z.array(
        z.object({
          text: z.string().max(64),
          url: z.string().optional(),
          callback_data: z.string().optional(),
        }),
      ),
    )
    .optional(),
  // Poll
  poll: z
    .object({
      question: z.string().min(1).max(500),
      options: z.array(z.string().min(1).max(200)).min(2).max(20),
      multiChoice: z.boolean().optional(),
    })
    .optional(),
  // Auto-delete timer (seconds from now)
  ttlSeconds: z.number().int().positive().max(604800).optional(),
  // Scheduled message
  scheduledFor: z.string().datetime().optional(),
  isViewOnce: z.boolean().optional(),
  isSilent: z.boolean().optional(),
  isStealth: z.boolean().optional(),
  isAnonymousForward: z.boolean().optional(),
  hideAuthor: z.boolean().optional(),
  clientTempId: z.string().min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
    const data = await listMessages({ chatId, userId: user!.id, cursor, limit });
    return ok(data);
  } catch (err) {
    return fail(err);
  }
}

export const POST = withUserRateLimit("messages", async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { chatId } = await params;
    const [chat, me] = await Promise.all([
      prisma.chat.findUnique({ where: { id: chatId }, select: { type: true, slowModeSeconds: true } }),
      prisma.user!.findUnique({ where: { id: user!.id }, select: { isReadOnly: true } }),
    ]);
    if (!chat) throw new HttpError(404, "chat_not_found");
    if (chat.type === "SERVICE") throw new HttpError(403, "service_chat_readonly");
    if (me?.isReadOnly) throw new HttpError(403, "read_only_mode");

    // Slow mode check
    if (chat.slowModeSeconds && chat.slowModeSeconds > 0) {
      const participant = await prisma.participant.findUnique({
        where: { chatId_userId: { chatId, userId: user!.id } },
        select: { role: true },
      });
      const isAdmin = participant?.role === "OWNER" || participant?.role === "ADMIN";
      if (!isAdmin) {
        const lastMessage = await prisma.message.findFirst({
          where: { chatId, senderId: user!.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        if (lastMessage) {
          const elapsed = (Date.now() - lastMessage.createdAt.getTime()) / 1000;
          if (elapsed < chat.slowModeSeconds) {
            const retryAfter = Math.ceil(chat.slowModeSeconds - elapsed);
            return NextResponse.json(
              { error: "slow_mode", retryAfter },
              { status: 429 },
            );
          }
        }
      }
    }
    const body = await parseJson(req, sendSchema);
    const expiresAt = body.ttlSeconds
      ? new Date(Date.now() + body.ttlSeconds * 1000)
      : null;

    // If hideAuthor is true, set isAnonymousForward and clear forwardedFromId
    const isAnonymousForward = body.hideAuthor || body.isAnonymousForward || false;
    const forwardedFromId = body.hideAuthor ? undefined : body.forwardedFromId;

    const message = await sendMessage({
      chatId,
      senderId: user!.id,
      type: body.type ?? "TEXT",
      content: body.content,
      mediaUrl: body.mediaUrl,
      thumbnailUrl: body.thumbnailUrl,
      fileName: body.fileName,
      fileSize: body.fileSize,
      replyToId: body.replyToId,
      forwardedFromId,
      mentions: body.mentions,
      linkTitle: body.linkTitle,
      linkDescription: body.linkDescription,
      linkImage: body.linkImage,
      linkSiteName: body.linkSiteName,
      linkUrl: body.linkUrl,
      keyboard: body.keyboard,
      poll: body.poll,
      expiresAt,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      isViewOnce: body.isViewOnce,
      isStealth: body.isStealth,
      isAnonymousForward,
    });
    checkAndAwardAchievements(user!.id).catch(console.error);
    return ok({ message, clientTempId: body.clientTempId });
  } catch (err) {
    return fail(err);
  }
});
