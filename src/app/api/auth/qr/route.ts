import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function generateRandomCode(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    const forwarded = (req.headers.get("x-forwarded-for") ?? "").split(",")[0];

    const code = generateRandomCode(32);
    const session = await prisma.qrLoginSession.create({
      data: {
        code,
        status: "pending",
        ipAddress: forwarded ?? "unknown",
        userAgent: ua,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      select: { id: true, code: true },
    });

    return ok({ code: session.code, sessionId: session.id });
  } catch (err) {
    return fail(err);
  }
}

const checkSchema = z.object({
  sessionId: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) throw new HttpError(400, "missing_sessionId");

    const session = await prisma.qrLoginSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, expiresAt: true, userId: true, confirmedAt: true },
    });

    if (!session) throw new HttpError(404, "session_not_found");

    const now = new Date();
    if (session.status === "pending" && session.expiresAt < now) {
      await prisma.qrLoginSession.update({
        where: { id: sessionId },
        data: { status: "expired" },
      });
      return ok({ status: "expired" });
    }

    if (session.status === "confirmed" && session.userId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      // Generate a token for the new session
      const token = `qr_${generateRandomCode(48)}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await prisma.session.create({
        data: {
          userId: session.userId,
          token,
          expiresAt,
          userAgent: req.headers.get("user-agent") ?? "QR Login",
          ipAddress: (req.headers.get("x-forwarded-for") ?? "").split(",")[0] ?? "unknown",
        },
      });

      // Clean up the QR session
      await prisma.qrLoginSession.delete({ where: { id: sessionId } });

      return ok({ status: "confirmed", token, user });
    }

    return ok({ status: session.status });
  } catch (err) {
    return fail(err);
  }
}
