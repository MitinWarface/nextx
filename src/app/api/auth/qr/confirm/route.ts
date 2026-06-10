import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, confirmSchema);

    const session = await prisma.qrLoginSession.findUnique({
      where: { code: body.code },
      select: { id: true, status: true, expiresAt: true },
    });

    if (!session) throw new HttpError(404, "session_not_found");

    if (session.status !== "pending") {
      throw new HttpError(400, "session_already_used");
    }

    const now = new Date();
    if (session.expiresAt < now) {
      await prisma.qrLoginSession.update({
        where: { id: session.id },
        data: { status: "expired" },
      });
      throw new HttpError(400, "session_expired");
    }

    await prisma.qrLoginSession.update({
      where: { id: session.id },
      data: {
        status: "confirmed",
        userId: user.id,
        confirmedAt: now,
      },
    });

    return ok({ success: true });
  } catch (err) {
    return fail(err);
  }
}
