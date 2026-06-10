/**
 * POST /api/users/me/password — change password
 */
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";
import { sendServiceMessage } from "@/lib/service-chat";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new HttpError(400, "currentPassword and newPassword required");
    }
    if (typeof currentPassword !== "string" || currentPassword.length < 1) {
      throw new HttpError(400, "invalid_current_password");
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      throw new HttpError(400, "password_too_short");
    }
    if (newPassword.length > 128) {
      throw new HttpError(400, "password_too_long");
    }
    if (newPassword === currentPassword) {
      throw new HttpError(400, "password_must_differ");
    }

    const fullUser = await prisma.user!.findUnique({
      where: { id: user!.id },
      select: { passwordHash: true },
    });

    if (!fullUser?.passwordHash) {
      throw new HttpError(500, "user_not_found");
    }

    const valid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!valid) {
      throw new HttpError(403, "wrong_password");
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user!.update({
      where: { id: user!.id },
      data: { passwordHash: newHash },
    });

    // Security notification
    sendServiceMessage({
      userId: user!.id,
      serviceType: "SECURITY",
      content: "Пароль успешно изменён",
    }).catch(console.error);

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
