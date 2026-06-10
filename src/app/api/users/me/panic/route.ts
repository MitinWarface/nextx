/**
 * POST /api/users/me/panic — setup, activate, or deactivate panic mode
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const panicSchema = z.object({
  action: z.enum(["setup", "activate", "deactivate"]),
  pin: z.string().min(4).max(8),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(req, panicSchema);

    const fullUser = await prisma.user!.findUnique({
      where: { id: user!.id },
      select: { panicPinHash: true, isPanicking: true },
    });

    if (body.action === "setup") {
      if (fullUser?.panicPinHash) {
        throw new HttpError(400, "panic_pin_already_set");
      }
      const hash = await bcrypt.hash(body.pin, 10);
      await prisma.user!.update({
        where: { id: user!.id },
        data: { panicPinHash: hash },
      });
      await prisma.securityEvent.create({
        data: { userId: user!.id, type: "panic_pin_setup" },
      });
      return ok({ success: true, action: "setup" });
    }

    if (body.action === "activate") {
      if (!fullUser?.panicPinHash) {
        throw new HttpError(400, "panic_pin_not_set");
      }
      if (fullUser.isPanicking) {
        throw new HttpError(400, "already_panicking");
      }
      const valid = await bcrypt.compare(body.pin, fullUser.panicPinHash);
      if (!valid) {
        throw new HttpError(403, "invalid_pin");
      }

      // Activate panic mode
      await prisma.user!.update({
        where: { id: user!.id },
        data: { isPanicking: true },
      });

      // Revoke all devices except current (keep latest device)
      const latestDevice = await prisma.device.findFirst({
        where: { userId: user!.id, isRevoked: false },
        orderBy: { lastActivity: "desc" },
      });

      await prisma.device.updateMany({
        where: {
          userId: user!.id,
          isRevoked: false,
          ...(latestDevice ? { id: { not: latestDevice.id } } : {}),
        },
        data: { isRevoked: true },
      });

      // Revoke all sessions except current
      const tokens = await prisma.session.findMany({
        where: { userId: user!.id },
        orderBy: { createdAt: "desc" },
      });
      if (tokens.length > 1) {
        await prisma.session.deleteMany({
          where: {
            userId: user!.id,
            id: { not: tokens[0].id },
          },
        });
      }

      await prisma.securityEvent.create({
        data: {
          userId: user!.id,
          type: "panic_mode_activated",
          details: { revokedDevices: true, revokedSessions: true },
        },
      });

      return ok({ success: true, action: "activate" });
    }

    // deactivate
    if (!fullUser?.panicPinHash) {
      throw new HttpError(400, "panic_pin_not_set");
    }
    const valid = await bcrypt.compare(body.pin, fullUser.panicPinHash);
    if (!valid) {
      throw new HttpError(403, "invalid_pin");
    }

    await prisma.user!.update({
      where: { id: user!.id },
      data: { isPanicking: false },
    });

    await prisma.securityEvent.create({
      data: { userId: user!.id, type: "panic_mode_deactivated" },
    });

    return ok({ success: true, action: "deactivate" });
  } catch (err) {
    return fail(err);
  }
}
