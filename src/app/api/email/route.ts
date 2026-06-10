import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const url = new URL(req.url);
    const folder = url.searchParams.get("folder") ?? "inbox";
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
    const skip = (page - 1) * limit;

    const where = folder === "sent"
      ? { fromUserId: user.id }
      : { toUserId: user.id };

    const [emails, total] = await Promise.all([
      prisma.internalEmail.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          subject: true,
          body: true,
          isRead: true,
          createdAt: true,
          from: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          to: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.internalEmail.count({ where }),
    ]);

    const unreadCount = await prisma.internalEmail.count({
      where: { toUserId: user.id, isRead: false },
    });

    return ok({ emails, total, unreadCount, page, limit });
  } catch (err) {
    return fail(err);
  }
}

const sendSchema = z.object({
  to: z.string().min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
});

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, sendSchema);

    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: body.to },
          { internalEmail: body.to },
        ],
      },
      select: { id: true },
    });

    if (!recipient) throw new HttpError(404, "recipient_not_found");
    if (recipient.id === user.id) throw new HttpError(400, "cannot_send_to_self");

    const email = await prisma.internalEmail.create({
      data: {
        fromUserId: user.id,
        toUserId: recipient.id,
        subject: body.subject,
        body: body.body,
      },
      select: {
        id: true,
        subject: true,
        body: true,
        createdAt: true,
      },
    });

    return ok({ email });
  } catch (err) {
    return fail(err);
  }
}
