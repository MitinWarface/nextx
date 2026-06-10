/**
 * GET /api/users/me/qr — Generate QR code data URL for user's profile.
 * QR content: nextx://user/{publicId} or http://localhost:3000/u/{username}
 */
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: { publicId: true, username: true },
    });
    if (!full) throw new HttpError(404, "user_not_found");

    const qrContent = full.publicId
      ? `nextx://user/${full.publicId}`
      : `http://localhost:3000/u/${full.username}`;

    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return ok({ qrDataUrl, publicId: full.publicId, username: full.username });
  } catch (err) {
    return fail(err);
  }
}
