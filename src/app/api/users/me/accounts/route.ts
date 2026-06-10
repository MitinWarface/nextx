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

    const accounts = await prisma.userAccount.findMany({
      where: { primaryId: user.id },
      select: {
        id: true,
        label: true,
        createdAt: true,
        secondary: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ accounts });
  } catch (err) {
    return fail(err);
  }
}

const linkSchema = z.object({
  username: z.string().min(3).max(32),
  label: z.string().min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, linkSchema);

    const target = await prisma.user.findUnique({
      where: { username: body.username },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");
    if (target.id === user.id) throw new HttpError(400, "cannot_link_self");

    const existing = await prisma.userAccount.findFirst({
      where: {
        primaryId: user.id,
        secondaryId: target.id,
      },
    });
    if (existing) throw new HttpError(409, "already_linked");

    const account = await prisma.userAccount.create({
      data: {
        primaryId: user.id,
        secondaryId: target.id,
        label: body.label,
      },
      select: {
        id: true,
        label: true,
        createdAt: true,
        secondary: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return ok({ account });
  } catch (err) {
    return fail(err);
  }
}

const unlinkSchema = z.object({
  accountId: z.string().min(1),
});

export async function DELETE(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, unlinkSchema);

    const account = await prisma.userAccount.findFirst({
      where: {
        id: body.accountId,
        primaryId: user.id,
      },
    });
    if (!account) throw new HttpError(404, "account_not_found");

    await prisma.userAccount.delete({ where: { id: body.accountId } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
