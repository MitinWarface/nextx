/**
 * POST /api/admin/moderation/anti-spam — scan for spam patterns
 * GET  /api/admin/moderation/anti-spam — list triggered sanctions
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const TOXICITY_KEYWORDS_RU = [
  "идиот", "дурак", "тупой", "урод", "мерзавец", "подонок", "негодяй",
  "CRETIN", " moron", "stupid", "idiot",
  "хуй", "пизда", "блять", "ебать", "сука", "нахуй", "похуй",
  "говно", "дерьмо", "жопа", "срака",
  "убить", "убей", "умри", "смерть", "труп",
  "наркотик", "наркотики", "купить наркотики",
  "педофил", "изнасилование",
];

interface SpamTrigger {
  userId: string;
  username: string;
  displayName: string;
  reason: string;
  messageCount: number;
  severity: "low" | "medium" | "high";
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const window = searchParams.get("window") ?? "1min";

    const now = new Date();
    let windowMs = 60_000;
    if (window === "5min") windowMs = 300_000;
    if (window === "1hour") windowMs = 3_600_000;
    const since = new Date(now.getTime() - windowMs);

    const triggers: SpamTrigger[] = [];

    // 1. High message rate (>100 in window)
    const highVolume = await prisma.$queryRawUnsafe<Array<{ senderId: string; count: bigint }>>(
      `SELECT "senderId", COUNT(*) as count
       FROM "Message"
       WHERE "createdAt" >= $1 AND "senderId" IS NOT NULL
       GROUP BY "senderId"
       HAVING COUNT(*) > 100`,
      since,
    );

    // 2. Mass link sending (>5 messages with links)
    const massLinks = await prisma.$queryRawUnsafe<Array<{ senderId: string; count: bigint }>>(
      `SELECT "senderId", COUNT(*) as count
       FROM "Message"
       WHERE "createdAt" >= $1 AND "linkUrl" IS NOT NULL AND "senderId" IS NOT NULL
       GROUP BY "senderId"
       HAVING COUNT(*) > 5`,
      since,
    );

    // 3. Excessive complaints (>10 reports against user)
    const complaints = await prisma.$queryRawUnsafe<Array<{ targetUserId: string; count: bigint }>>(
      `SELECT "targetUserId", COUNT(*) as count
       FROM "Report"
       WHERE "status" = 'PENDING'
       GROUP BY "targetUserId"
       HAVING COUNT(*) > 10`,
    );

    // 4. Toxicity detection — Russian keywords
    const toxicityTriggers = await detectToxicity(since);
    for (const t of toxicityTriggers) {
      const u = await prisma.user.findUnique({
        where: { id: t.userId },
        select: { username: true, displayName: true },
      });
      if (u) triggers.push({
        userId: t.userId, username: u.username, displayName: u.displayName,
        reason: t.reason,
        messageCount: t.count,
        severity: t.severity,
      });
    }

    // 5. Repeated message detection (same content 3+ times in 5 min)
    const repeatedWindow = new Date(now.getTime() - 5 * 60_000);
    const repeated = await prisma.$queryRawUnsafe<Array<{ senderId: string; content: string; count: bigint }>>(
      `SELECT "senderId", "content", COUNT(*) as count
       FROM "Message"
       WHERE "createdAt" >= $1 AND "senderId" IS NOT NULL AND "content" IS NOT NULL AND "type" = 'TEXT'
       GROUP BY "senderId", "content"
       HAVING COUNT(*) >= 3`,
      repeatedWindow,
    );
    const repeatedUserMap = new Map<string, { username: string; displayName: string }>();
    for (const r of repeated) repeatedUserMap.set(r.senderId, { username: "", displayName: "" });
    if (repeatedUserMap.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: [...repeatedUserMap.keys()] } },
        select: { id: true, username: true, displayName: true },
      });
      for (const u of users) repeatedUserMap.set(u.id, { username: u.username, displayName: u.displayName });
    }
    for (const r of repeated) {
      const u = repeatedUserMap.get(r.senderId);
      if (u) triggers.push({
        userId: r.senderId, username: u.username, displayName: u.displayName,
        reason: `Одинаковое сообщение ${r.count} раз за 5 минут`,
        messageCount: Number(r.count), severity: "medium",
      });
    }

    // 6. Link spam detection (5+ links in 1 min)
    const linkSpam = await prisma.$queryRawUnsafe<Array<{ senderId: string; count: bigint }>>(
      `SELECT "senderId", COUNT(*) as count
       FROM "Message"
       WHERE "createdAt" >= $1 AND "senderId" IS NOT NULL AND "content" ~* 'https?://'
       GROUP BY "senderId"
       HAVING COUNT(*) >= 5`,
      since,
    );

    // 7. Media flood detection (10+ images in 2 min)
    const mediaWindow = new Date(now.getTime() - 2 * 60_000);
    const mediaFlood = await prisma.$queryRawUnsafe<Array<{ senderId: string; count: bigint }>>(
      `SELECT "senderId", COUNT(*) as count
       FROM "Message"
       WHERE "createdAt" >= $1 AND "senderId" IS NOT NULL
         AND "type" IN ('IMAGE', 'VIDEO', 'STICKER')
       GROUP BY "senderId"
       HAVING COUNT(*) >= 10`,
      mediaWindow,
    );

    // 8. Mention spam detection (@user 5+ times in 1 message)
    const mentionSpam = await prisma.$queryRawUnsafe<Array<{ senderId: string; id: string; content: string }>>(
      `SELECT "senderId", "id", "content"
       FROM "Message"
       WHERE "createdAt" >= $1 AND "senderId" IS NOT NULL AND "content" IS NOT NULL
         AND array_length(regexp_split_to_array("content", '@[a-zA-Z0-9_]+'), 1) >= 6`,
      since,
    );

    // Resolve user info for all triggers
    const allUserIds = new Set<string>();
    for (const v of highVolume) allUserIds.add(v.senderId);
    for (const v of massLinks) allUserIds.add(v.senderId);
    for (const c of complaints) allUserIds.add(c.targetUserId);
    for (const v of linkSpam) allUserIds.add(v.senderId);
    for (const v of mediaFlood) allUserIds.add(v.senderId);
    for (const v of mentionSpam) allUserIds.add(v.senderId);

    const userMap = new Map<string, { username: string; displayName: string }>();
    if (allUserIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: [...allUserIds] } },
        select: { id: true, username: true, displayName: true },
      });
      for (const u of users) userMap.set(u.id, { username: u.username, displayName: u.displayName });
    }

    for (const v of highVolume) {
      const u = userMap.get(v.senderId);
      if (u) triggers.push({
        userId: v.senderId, username: u.username, displayName: u.displayName,
        reason: `${v.count} сообщений за ${window}`,
        messageCount: Number(v.count), severity: "high",
      });
    }

    for (const v of massLinks) {
      const u = userMap.get(v.senderId);
      if (u) triggers.push({
        userId: v.senderId, username: u.username, displayName: u.displayName,
        reason: `${v.count} сообщений со ссылками за ${window}`,
        messageCount: Number(v.count), severity: "medium",
      });
    }

    for (const c of complaints) {
      const u = userMap.get(c.targetUserId);
      if (u) triggers.push({
        userId: c.targetUserId, username: u.username, displayName: u.displayName,
        reason: `${c.count} жалоб от пользователей`,
        messageCount: Number(c.count), severity: "high",
      });
    }

    for (const v of linkSpam) {
      const u = userMap.get(v.senderId);
      if (u) triggers.push({
        userId: v.senderId, username: u.username, displayName: u.displayName,
        reason: `${v.count} ссылок за 1 минуту`,
        messageCount: Number(v.count), severity: "medium",
      });
    }

    for (const v of mediaFlood) {
      const u = userMap.get(v.senderId);
      if (u) triggers.push({
        userId: v.senderId, username: u.username, displayName: u.displayName,
        reason: `${v.count} медиа за 2 минуты`,
        messageCount: Number(v.count), severity: "medium",
      });
    }

    const mentionUserMap = new Map<string, { count: number }>();
    for (const v of mentionSpam) {
      const existing = mentionUserMap.get(v.senderId);
      if (existing) existing.count++;
      else mentionUserMap.set(v.senderId, { count: 1 });
    }
    for (const [userId, data] of mentionUserMap) {
      const u = userMap.get(userId);
      if (u) triggers.push({
        userId, username: u.username, displayName: u.displayName,
        reason: `${data.count} сообщений с 5+ упоминаниями`,
        messageCount: data.count, severity: "low",
      });
    }

    return ok({ triggers, window, scannedAt: now.toISOString() });
  } catch (err) {
    return fail(err);
  }
}

async function detectToxicity(since: Date): Promise<Array<{ userId: string; reason: string; count: number; severity: "low" | "medium" | "high" }>> {
  const results: Array<{ userId: string; reason: string; count: number; severity: "low" | "medium" | "high" }> = [];
  const lowerKeywords = TOXICITY_KEYWORDS_RU.map((k) => k.toLowerCase());

  // Sample recent messages for toxicity check (max 500)
  const messages = await prisma.message.findMany({
    where: {
      createdAt: { gte: since },
      type: "TEXT",
      content: { not: null },
    },
    select: { id: true, senderId: true, content: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const userHits = new Map<string, { count: number; keywords: string[] }>();
  for (const msg of messages) {
    if (!msg.content) continue;
    const lower = msg.content.toLowerCase();
    for (const kw of lowerKeywords) {
      if (lower.includes(kw)) {
        const existing = userHits.get(msg.senderId) ?? { count: 0, keywords: [] };
        existing.count++;
        if (!existing.keywords.includes(kw)) existing.keywords.push(kw);
        userHits.set(msg.senderId, existing);
      }
    }
  }

  for (const [userId, data] of userHits) {
    if (data.count >= 3) {
      results.push({
        userId,
        reason: `Токсичный контент: ${data.keywords.slice(0, 3).join(", ")}`,
        count: data.count,
        severity: data.count >= 10 ? "high" : data.count >= 5 ? "medium" : "low",
      });
    }
  }

  return results;
}

const actionSchema = z.object({
  action: z.enum(["mute_readonly", "ban", "permaban"]),
  userId: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await parseJson(req, actionSchema);
    const { action, userId, reason } = body;

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isBanned: true, isPermabanned: true, isReadOnly: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");
    if (target.role === "SUPER_ADMIN" || target.role === "OWNER") {
      throw new HttpError(403, "cannot_moderate_admin");
    }

    switch (action) {
      case "mute_readonly": {
        if (target.isReadOnly) throw new HttpError(400, "already_readonly");
        await prisma.user.update({ where: { id: userId }, data: { isReadOnly: true } });
        await logAudit(admin.id, "USER_BAN", `user:${userId}`, {
          type: "anti_spam_readonly",
          reason: reason ?? "Anti-spam: read-only",
        });
        return ok({ ok: true, action: "readonly" });
      }
      case "ban": {
        if (target.isBanned) throw new HttpError(400, "already_banned");
        await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
        await logAudit(admin.id, "USER_BAN", `user:${userId}`, {
          type: "anti_spam_ban",
          reason: reason ?? "Anti-spam: banned",
        });
        return ok({ ok: true, action: "banned" });
      }
      case "permaban": {
        if (target.isPermabanned) throw new HttpError(400, "already_permabanned");
        await prisma.user.update({ where: { id: userId }, data: { isBanned: true, isPermabanned: true } });
        await logAudit(admin.id, "USER_BAN", `user:${userId}`, {
          type: "anti_spam_permaban",
          reason: reason ?? "Anti-spam: permanent ban",
        });
        return ok({ ok: true, action: "permabanned" });
      }
      default:
        throw new HttpError(400, "invalid_action");
    }
  } catch (err) {
    return fail(err);
  }
}
