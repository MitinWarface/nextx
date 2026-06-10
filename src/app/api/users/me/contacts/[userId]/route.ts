/**
 * POST   /api/users/me/contacts/[userId] — accept (add to contacts)
 * DELETE /api/users/me/contacts/[userId] — reject or block
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { userId: targetId } = await params;

    if (!targetId) throw new HttpError(400, "userId required");
    if (targetId === user!.id) throw new HttpError(400, "cannot_add_self");

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    // Check if already a contact
    const existing = await prisma.contact.findUnique({
      where: { ownerId_targetId: { ownerId: user!.id, targetId } },
    });
    if (existing) throw new HttpError(409, "already_contact");

    // Check for pending friend request from the target and accept it
    const pendingRequest = await prisma.friendRequest.findFirst({
      where: {
        senderId: targetId,
        receiverId: user!.id,
        status: "PENDING",
      },
    });

    if (pendingRequest) {
      // Accept: create both contacts and update request
      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id: pendingRequest.id },
          data: { status: "ACCEPTED" },
        }),
        prisma.contact.create({ data: { ownerId: user!.id, targetId } }),
        prisma.contact.create({ data: { ownerId: targetId, targetId: user!.id } }),
      ]);
    } else {
      // No pending request: just add as contact (one-way)
      await prisma.contact.create({ data: { ownerId: user!.id, targetId } });
    }

    return ok({ contact: target });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { userId: targetId } = await params;

    if (!targetId) throw new HttpError(400, "userId required");

    const body = await req.json().catch(() => ({}));
    const action = (body.action as string) || "reject";

    if (action === "block") {
      // Block: upsert contact with isBlocked=true and reject any pending request
      await prisma.$transaction([
        prisma.contact.upsert({
          where: { ownerId_targetId: { ownerId: user!.id, targetId } },
          create: { ownerId: user!.id, targetId, isBlocked: true },
          update: { isBlocked: true },
        }),
        prisma.friendRequest.updateMany({
          where: {
            OR: [
              { senderId: targetId, receiverId: user!.id },
              { senderId: user!.id, receiverId: targetId },
            ],
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        }),
      ]);
      return ok({ ok: true, action: "blocked" });
    }

    // Reject: delete pending friend request and any one-sided contact
    await prisma.$transaction([
      prisma.friendRequest.deleteMany({
        where: {
          senderId: targetId,
          receiverId: user!.id,
          status: "PENDING",
        },
      }),
      prisma.contact.deleteMany({
        where: { ownerId: user!.id, targetId },
      }),
    ]);

    return ok({ ok: true, action: "rejected" });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
