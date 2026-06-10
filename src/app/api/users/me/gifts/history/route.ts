/**
 * GET /api/users/me/gifts/history — gift history with sent/received tabs
 * Query params: tab=sent|received (default: received)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "received";

    if (tab === "sent") {
      const gifts = await prisma.gift.findMany({
        where: { senderId: user!.id },
        include: {
          receiver: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return ok({ gifts });
    }

    // Default: received
    const gifts = await prisma.gift.findMany({
      where: { receiverId: user!.id },
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ gifts });
  } catch (err) {
    return fail(err);
  }
}
