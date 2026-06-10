/**
 * POST /api/auth/device — register device after login
 * Called by client with navigator.userAgent + IP info
 * Also sends push notification to all other devices about the new login.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { parseUserAgent } from "@/lib/user-agent";
import { sendPushToUser } from "@/services/push-service";

export const dynamic = "force-dynamic";

const deviceSchema = z.object({
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, deviceSchema);
    const ua = body.userAgent ?? req.headers.get("user-agent") ?? "";
    const parsed = parseUserAgent(ua);

    const forwarded = (req.headers.get("x-forwarded-for") ?? "").split(",")[0];
    const ip = body.ipAddress ?? forwarded ?? "unknown";

    // Find or create device
    const existing = await prisma.device.findFirst({
      where: { userId: user.id, deviceName: parsed.deviceName, isRevoked: false },
      select: { id: true },
    });

    const isNewLogin = !existing;

    if (existing) {
      await prisma.device.update({
        where: { id: existing.id },
        data: { lastActivity: new Date(), ipAddress: ip, platform: parsed.platform, browser: parsed.browser, country: body.country, city: body.city },
      });
    } else {
      await prisma.device.create({
        data: {
          userId: user.id,
          deviceName: parsed.deviceName,
          platform: parsed.platform,
          browser: parsed.browser,
          ipAddress: ip,
          country: body.country,
          city: body.city,
          trustLevel: "new",
          lastActivity: new Date(),
        },
      });
    }

    // Notify other devices about new login
    if (isNewLogin) {
      const otherDevices = await prisma.device.findMany({
        where: { userId: user.id, isRevoked: false, NOT: { deviceName: parsed.deviceName } },
        select: { deviceName: true },
      });

      if (otherDevices.length > 0) {
        sendPushToUser(user.id, {
          title: "Новый вход в аккаунт",
          body: `Новое устройство: ${parsed.deviceName}${ip !== "unknown" ? ` (${ip})` : ""}`,
          tag: "new-login",
        }).catch(() => {});
      }
    }

    return ok({ ok: true, device: parsed.deviceName });
  } catch (err) {
    return fail(err);
  }
}
