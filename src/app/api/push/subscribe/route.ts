/**
 * GET  /api/push/vapid-key — публичный VAPID-ключ
 * POST /api/push/subscribe — сохранить подписку
 * DELETE /api/push/subscribe — удалить подписку
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, parseJson, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";
import {
  getPublicVapidKey,
  isPushConfigured,
  removeSubscription,
  saveSubscription,
} from "@/services/push-service";

const subSchema = z.object({
  endpoint: z.string().min(10),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(5),
  }),
});

export async function GET() {
  return ok({
    configured: isPushConfigured(),
    vapidKey: getPublicVapidKey(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    if (!isPushConfigured()) {
      return fail(new Error("push_not_configured"));
    }
    const body = await parseJson(req, subSchema);
    const ua = req.headers.get("user-agent");
    await saveSubscription(user.id, body, ua);
    return ok({ subscribed: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const body = (await req.json().catch(() => ({}))) as {
      endpoint?: string;
    };
    if (!body.endpoint) {
      return fail(new Error("endpoint_required"));
    }
    // Сначала проверим, что подписка принадлежит пользователю
    const sub = await (
      await import("@/lib/prisma")
    ).prisma.pushSubscription.findUnique({
      where: { endpoint: body.endpoint },
    });
    if (!sub || sub.userId !== user.id) {
      return fail(new Error("not_found_or_forbidden"));
    }
    await removeSubscription(body.endpoint);
    return ok({ unsubscribed: true });
  } catch (err) {
    return fail(err);
  }
}
