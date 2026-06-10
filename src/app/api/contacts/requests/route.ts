/**
 * GET  /api/contacts/requests — list pending friend requests
 * POST /api/contacts/requests — send friend request
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const [received, sent] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { receiverId: user!.id, status: "PENDING" },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendRequest.findMany({
        where: { senderId: user!.id, status: "PENDING" },
        include: {
          receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return ok({ received, sent });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const receiverId = body.userId as string;

    if (!receiverId) throw new HttpError(400, "userId required");
    if (receiverId === user!.id) throw new HttpError(400, "cannot_add_self");

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: user!.id, receiverId },
          { senderId: receiverId, receiverId: user!.id },
        ],
      },
    });
    if (existing) throw new HttpError(409, "request_exists");

    const request = await prisma.friendRequest.create({
      data: { senderId: user!.id, receiverId },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    // Notify via socket
    const io = (globalThis as any).__ioInstance;
    if (io) {
      io.to(`user:${receiverId}`).emit("friend:request", {
        id: request.id,
        sender: request.sender,
        createdAt: request.createdAt,
      });
    }

    return ok({ request });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
