/**
 * POST /api/streams/[streamId]/live — start or stop a live stream
 * Body: { action: "start" | "stop" }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, parseJson, HttpError } from "@/lib/api-helpers";

const schema = z.object({ action: z.enum(["start", "stop"]) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { streamId } = await params;
    const body = await parseJson(req, schema);

    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new HttpError(404, "not_found");

    const member = await prisma.participant.findFirst({
      where: { chatId: stream.chatId, userId: user!.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!member) throw new HttpError(403, "not_authorized");

    if (body.action === "start") {
      if (stream.isLive) throw new HttpError(400, "already_live");
      const updated = await prisma.liveStream.update({
        where: { id: streamId },
        data: { isLive: true, startedAt: new Date(), viewerCount: 0 },
      });
      return ok({ stream: updated });
    } else {
      if (!stream.isLive) throw new HttpError(400, "not_live");
      const updated = await prisma.liveStream.update({
        where: { id: streamId },
        data: { isLive: false, endedAt: new Date() },
      });
      return ok({ stream: updated });
    }
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
