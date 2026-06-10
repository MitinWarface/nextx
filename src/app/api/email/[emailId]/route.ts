import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { emailId } = await params;

    const email = await prisma.internalEmail.findUnique({
      where: { id: emailId },
      select: {
        id: true,
        subject: true,
        body: true,
        isRead: true,
        createdAt: true,
        from: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        to: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    if (!email) throw new HttpError(404, "email_not_found");
    if (email.from.id !== user.id && email.to?.id !== user.id) {
      throw new HttpError(403, "forbidden");
    }

    if (!email.isRead && email.to?.id === user.id) {
      await prisma.internalEmail.update({
        where: { id: emailId },
        data: { isRead: true },
      });
    }

    return ok({ email: { ...email, isRead: true } });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ emailId: string }> },
) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { emailId } = await params;

    const email = await prisma.internalEmail.findUnique({
      where: { id: emailId },
      select: { fromUserId: true, toUserId: true },
    });

    if (!email) throw new HttpError(404, "email_not_found");
    if (email.fromUserId !== user.id && email.toUserId !== user.id) {
      throw new HttpError(403, "forbidden");
    }

    await prisma.internalEmail.delete({ where: { id: emailId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
