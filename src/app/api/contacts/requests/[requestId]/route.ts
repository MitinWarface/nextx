/**
 * POST /api/contacts/requests/[requestId]/accept — accept friend request
 * DELETE /api/contacts/requests/[requestId] — reject/cancel friend request
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { requestId } = await params;

    const request = await prisma.friendRequest.findFirst({
      where: { id: requestId, receiverId: user!.id, status: "PENDING" },
    });
    if (!request) throw new HttpError(404, "request_not_found");

    await prisma.$transaction([
      prisma.friendRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } }),
      prisma.contact.create({ data: { ownerId: user!.id, targetId: request.senderId } }),
      prisma.contact.create({ data: { ownerId: request.senderId, targetId: user!.id } }),
    ]);

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { requestId } = await params;

    await prisma.friendRequest.deleteMany({
      where: {
        id: requestId,
        OR: [{ senderId: user!.id }, { receiverId: user!.id }],
      },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
