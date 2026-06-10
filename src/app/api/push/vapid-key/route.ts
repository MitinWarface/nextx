/**
 * GET /api/push/vapid-key — публичный VAPID-ключ для подписки.
 */
import { ok, fail } from "@/lib/api-helpers";
import { getPublicVapidKey, isPushConfigured } from "@/services/push-service";

export async function GET() {
  try {
    return ok({
      configured: isPushConfigured(),
      vapidKey: getPublicVapidKey(),
    });
  } catch (err) {
    return fail(err);
  }
}
