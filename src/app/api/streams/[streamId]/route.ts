/**
 * GET    /api/streams/[streamId] — get stream details
 * PATCH  /api/streams/[streamId] — update stream title/description
 * DELETE /api/streams/[streamId] — delete a stream
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { streamId } = await params;

    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: {
        chat: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!stream) throw new HttpError(404, "not_found");
    return ok({ stream });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { streamId } = await params;
    const body = await req.json().catch(() => ({}));

    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new HttpError(404, "not_found");

    const member = await prisma.participant.findFirst({
      where: { chatId: stream.chatId, userId: user!.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!member) throw new HttpError(403, "not_authorized");

    const updated = await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });
    return ok({ stream: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { streamId } = await params;

    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw new HttpError(404, "not_found");

    const member = await prisma.participant.findFirst({
      where: { chatId: stream.chatId, userId: user!.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!member) throw new HttpError(403, "not_authorized");

    await prisma.liveStream.delete({ where: { id: streamId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
