import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import {
  incrementViewCount,
  incrementForwardCount,
  incrementCopyCount,
} from "@/services/message-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthorized");
    const { messageId } = await params;

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { viewCount: true, forwardCount: true, copyCount: true },
    });
    if (!msg) throw new HttpError(404, "message_not_found");

    return ok({
      viewCount: msg.viewCount,
      forwardCount: msg.forwardCount,
      copyCount: msg.copyCount,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthorized");
    const { messageId } = await params;

    const body = await req.json();
    const action = body?.action as string;

    if (action === "view") {
      await incrementViewCount(messageId);
    } else if (action === "forward") {
      await incrementForwardCount(messageId);
    } else if (action === "copy") {
      await incrementCopyCount(messageId);
    } else {
      throw new HttpError(400, "invalid_action");
    }

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { viewCount: true, forwardCount: true, copyCount: true },
    });

    return ok({
      viewCount: msg?.viewCount ?? 0,
      forwardCount: msg?.forwardCount ?? 0,
      copyCount: msg?.copyCount ?? 0,
    });
  } catch (err) {
    return fail(err);
  }
}
