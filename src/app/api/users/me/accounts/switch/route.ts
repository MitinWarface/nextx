import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const switchSchema = z.object({
  accountId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, switchSchema);

    const account = await prisma.userAccount.findFirst({
      where: {
        id: body.accountId,
        primaryId: user.id,
      },
      select: { secondaryId: true },
    });
    if (!account) throw new HttpError(404, "account_not_found");

    const targetUser = await prisma.user.findUnique({
      where: { id: account.secondaryId },
      select: { id: true, username: true, displayName: true, avatarUrl: true, isBanned: true, isPermabanned: true },
    });
    if (!targetUser) throw new HttpError(404, "target_user_not_found");
    if (targetUser.isBanned || targetUser.isPermabanned) throw new HttpError(403, "account_banned");

    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");
    const token = await new SignJWT({ uid: targetUser.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: targetUser.id,
        token,
        expiresAt,
        userAgent: req.headers.get("user-agent") ?? null,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });

    return ok({
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        avatarUrl: targetUser.avatarUrl,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
