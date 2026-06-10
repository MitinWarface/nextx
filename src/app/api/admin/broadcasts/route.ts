import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { sendServiceMessage } from "@/lib/service-chat";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["SECURITY", "UPDATE", "NEWS", "SYSTEM", "SUPPORT"] as const;

const schema = z.object({
  content: z.string().min(1, "content_required"),
  serviceType: z.enum(VALID_TYPES).optional().default("SYSTEM"),
  userId: z.string().uuid().optional(),
  broadcastToAll: z.boolean().optional(),
}).refine(
  (data) => data.userId || data.broadcastToAll,
  { message: "userId or broadcastToAll is required" },
);

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { content, serviceType, userId, broadcastToAll } = parsed.data;
    const trimmedContent = content.trim();

    if (broadcastToAll) {
      const users = await prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });

      const BATCH_SIZE = 50;
      let sent = 0;
      let failed = 0;

      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((user) =>
            sendServiceMessage({ userId: user.id, serviceType, content: trimmedContent })
          ),
        );
        for (const r of results) {
          if (r.status === "fulfilled") sent++;
          else failed++;
        }
      }

      await logAudit(admin.id, "BROADCAST_SEND", "broadcast", {
        serviceType,
        content: trimmedContent.slice(0, 200),
        totalUsers: users.length,
        sent,
        failed,
      });

      return ok({ sent, failed, total: users.length });
    }

    if (userId) {
      await sendServiceMessage({ userId, serviceType, content: trimmedContent });

      await logAudit(admin.id, "BROADCAST_SEND", "broadcast", {
        serviceType,
        content: trimmedContent.slice(0, 200),
        targetUserId: userId,
      });

      return ok({ sent: 1, failed: 0, total: 1 });
    }

    throw new HttpError(400, "userId_or_broadcastToAll_required");
  } catch (err) {
    return fail(err);
  }
}
