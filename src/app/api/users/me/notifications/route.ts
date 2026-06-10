/**
 * GET  /api/users/me/notifications — get notification settings
 * PATCH /api/users/me/notifications — update notification settings
 *
 * Settings are stored in localStorage on the client for now.
 * In production, add a NotificationSettings model to Prisma.
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

const DEFAULTS = {
  pushEnabled: true,
  soundEnabled: true,
  showPreview: true,
};

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    // Server always returns defaults — client stores overrides in localStorage
    return ok({ settings: DEFAULTS });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();

    // Validate fields
    const allowed = ["pushEnabled", "soundEnabled", "showPreview"];
    const settings: Record<string, boolean> = {};
    for (const key of allowed) {
      if (key in body && typeof body[key] === "boolean") {
        settings[key] = body[key];
      }
    }

    // Acknowledge — client persists to localStorage
    return ok({ ok: true, settings });
  } catch (err) {
    return fail(err);
  }
}
