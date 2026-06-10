/**
 * GET /api/users/me/panic/status — get panic mode status
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const fullUser = await prisma.user!.findUnique({
      where: { id: user!.id },
      select: {
        isPanicking: true,
        panicPinHash: true,
      },
    });

    return ok({
      isPanicking: fullUser?.isPanicking ?? false,
      isPinSet: !!fullUser?.panicPinHash,
    });
  } catch (err) {
    return fail(err);
  }
}
