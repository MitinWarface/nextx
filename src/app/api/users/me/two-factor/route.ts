/**
 * POST /api/users/me/two-factor/setup    — generate TOTP secret + QR
 * POST /api/users/me/two-factor/enable   — verify code + enable
 * POST /api/users/me/two-factor/disable  — verify code + disable
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { generateSecret, generate, verify } from "otplib";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { sendServiceMessage } from "@/lib/service-chat";

const APP_NAME = "NextX";

function makeUri(secret: string, accountName: string, issuer: string): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) throw new HttpError(401, "unauthorized");
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await parseJson(req, z.object({ code: z.string().length(6).optional() }));

    if (action === "setup") {
      const secret = generateSecret();
      const otpauth = makeUri(secret, user.username, APP_NAME);

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: secret },
      });

      const qrDataUrl = await QRCode.toDataURL(otpauth);

      return ok({ secret, otpauth, qr: qrDataUrl });
    }

    if (action === "enable") {
      if (!body.code) throw new HttpError(400, "code_required");
      const userData = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorSecret: true } });
      if (!userData?.twoFactorSecret) throw new HttpError(400, "setup_required");

      const isValid = verify({ token: body.code, secret: userData.twoFactorSecret });
      if (!isValid) throw new HttpError(400, "invalid_code");

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      });

      sendServiceMessage({
        userId: user.id,
        serviceType: "SECURITY",
        content: "Подключена двухфакторная защита",
      }).catch(console.error);

      return ok({ enabled: true });
    }

    if (action === "disable") {
      if (!body.code) throw new HttpError(400, "code_required");
      const userData = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorSecret: true, twoFactorEnabled: true } });
      if (!userData?.twoFactorEnabled) throw new HttpError(400, "not_enabled");

      const isValid = verify({ token: body.code, secret: userData.twoFactorSecret! });
      if (!isValid) throw new HttpError(400, "invalid_code");

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });

      sendServiceMessage({
        userId: user.id,
        serviceType: "SECURITY",
        content: "Двухфакторная защита отключена",
      }).catch(console.error);

      return ok({ enabled: false });
    }

    throw new HttpError(400, "invalid_action");
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    return fail(err);
  }
}
