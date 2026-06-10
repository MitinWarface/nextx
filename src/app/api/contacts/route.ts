/**
 * GET  /api/contacts — list my contacts
 * GET  /api/contacts?chatted=true — users I have chatted with
 * POST /api/contacts — add contact
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const chatted = req.nextUrl.searchParams.get("chatted");

    if (chatted === "true") {
      const chats = await prisma.chat.findMany({
        where: {
          type: "PRIVATE",
          participants: { some: { userId: user!.id } },
        },
        select: {
          participants: {
            select: { userId: true },
          },
        },
      });

      const userIds = [
        ...new Set(
          chats
            .flatMap((c) => c.participants.map((p) => p.userId))
            .filter((id) => id !== user!.id),
        ),
      ];

      if (userIds.length === 0) return ok({ contacts: [] });

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
      });

      return ok({ contacts: users.map((u) => ({ user: u })) });
    }

    const contacts = await prisma.contact.findMany({
      where: { ownerId: user!.id, isBlocked: false },
      include: {
        target: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ contacts: contacts.map((c) => ({ ...c, user: c.target })) });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await req.json();
    const targetId = body.userId as string;

    if (!targetId) throw new HttpError(400, "userId required");
    if (targetId === user!.id) throw new HttpError(400, "cannot_add_self");

    const target = await prisma.user!.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new HttpError(404, "user_not_found");

    const existing = await prisma.contact.findUnique({ where: { ownerId_targetId: { ownerId: user!.id, targetId } } });
    if (existing) throw new HttpError(409, "already_contact");

    const contact = await prisma.contact.create({
      data: { ownerId: user!.id, targetId, nickname: body.nickname ?? null },
      include: {
        target: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      },
    });

    return ok({ contact: { ...contact, user: contact.target } });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
