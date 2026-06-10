/**
 * Web Push service: VAPID-отправка, управление подписками.
 * Зависит от `web-push` (Node only).
 */
// @ts-expect-error - web-push doesn't ship types
import webpushLib from "web-push";
const webpush = webpushLib.default ?? webpushLib;
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:dev@nextx.local";

let configured = false;

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

function configure() {
  if (configured) return;
  if (!isPushConfigured()) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC!, VAPID_PRIVATE!);
  configured = true;
}

export interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }
  configure();
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (err: unknown) {
        failed++;
        // 404/410 — endpoint устарел, удаляем подписку
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: s.id } })
            .catch(() => undefined);
        }
      }
    }),
  );
  return { sent, failed };
}

export async function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string | null,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent ?? null,
    },
    update: {
      userId,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent ?? null,
    },
  });
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await prisma.pushSubscription
    .delete({ where: { endpoint } })
    .catch(() => undefined);
}

export function getPublicVapidKey(): string | null {
  return VAPID_PUBLIC ?? null;
}
