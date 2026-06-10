import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const me = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    if (!me) throw new HttpError(401, "unauthorized");
    const contacts = await prisma.contact.findMany({
      where: { ownerId: me.id, isBlocked: true },
      select: {
        target: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({
      users: contacts.map((c) => c.target),
    });
  } catch (err) {
    return fail(err);
  }
}
