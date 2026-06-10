/**
 * POST /api/vault/unlock — verify PIN to access vault
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

const unlockSchema = z.object({
  pin: z.string().min(4).max(8),
  setPin: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(req, unlockSchema);

    const fullUser = await prisma.user!.findUnique({
      where: { id: user!.id },
      select: { vaultPinHash: true },
    });

    // If setting PIN for the first time
    if (body.setPin) {
      if (fullUser?.vaultPinHash) {
        throw new HttpError(400, "pin_already_set");
      }
      const hash = await bcrypt.hash(body.pin, 10);
      await prisma.user!.update({
        where: { id: user!.id },
        data: { vaultPinHash: hash },
      });
      return ok({ unlocked: true, pinSet: true });
    }

    // Verify existing PIN
    if (!fullUser?.vaultPinHash) {
      // No PIN set — allow access (first time)
      return ok({ unlocked: true, pinSet: false });
    }

    const valid = await bcrypt.compare(body.pin, fullUser.vaultPinHash);
    if (!valid) {
      throw new HttpError(403, "invalid_pin");
    }

    return ok({ unlocked: true, pinSet: true });
  } catch (err) {
    return fail(err);
  }
}
