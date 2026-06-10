/**
 * GET  /api/users/me    — текущий пользователь (расширенный, с bio)
 * PATCH /api/users/me   — обновить профиль
 * DELETE /api/users/me  — пометить аккаунт на удаление (GDPR)
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { updateProfile } from "@/services/user-service";
import { sendServiceMessage } from "@/lib/service-chat";

const patchSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_]+$/, "invalid_username_format")
    .optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.string().min(1).max(500).nullable().optional(),
  website: z.string().url().nullable().optional(),
  socialLinks: z
    .object({
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      github: z.string().optional(),
      telegram: z.string().optional(),
    })
    .nullable()
    .optional(),
  accountType: z.enum(["personal", "company", "brand", "media", "shop"]).optional(),
  phone: z.string().max(20).nullable().optional(),
  statusEmoji: z.string().max(4).nullable().optional(),
  statusText: z.string().max(64).nullable().optional(),
  statusExpiresAt: z.string().datetime().nullable().optional(),
  customStatus: z.string().max(100).nullable().optional(),
  stealthMode: z.boolean().optional(),
  bannerUrl: z.string().max(500).nullable().optional(),
  animatedAvatarUrl: z.string().max(500).nullable().optional(),
  accentColor: z.string().max(20).nullable().optional(),
  interests: z.array(z.string().min(2).max(50)).max(20).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        animatedAvatarUrl: true,
        bio: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
        role: true,
        website: true,
        socialLinks: true,
        accountType: true,
        publicId: true,
        reputation: true,
        statusEmoji: true,
        statusText: true,
        statusExpiresAt: true,
        customStatus: true,
        stealthMode: true,
        usernameHistory: true,
        bannerUrl: true,
        accentColor: true,
        premiumStatus: true,
        interests: true,
      },
    });
    if (!full) return fail(new Error("user_not_found"));
    return ok({
      ...full,
      lastSeenAt: full.lastSeenAt?.toISOString() ?? new Date().toISOString(),
      createdAt: full.createdAt.toISOString(),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const body = await parseJson(req, patchSchema);
    // If username is changing, push old one to history
    if (body.username) {
      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { username: true, usernameHistory: true },
      });
      if (current && current.username && !current.usernameHistory.includes(current.username)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { usernameHistory: { push: current.username } },
        });
      }
    }

    const updated = await updateProfile({
      userId: user.id,
      displayName: body.displayName,
      username: body.username,
      bio: body.bio,
      avatarUrl: body.avatarUrl,
      website: body.website,
      socialLinks: body.socialLinks,
      accountType: body.accountType,
    });

    // Handle status updates separately
    if (
      body.statusEmoji !== undefined ||
      body.statusText !== undefined ||
      body.statusExpiresAt !== undefined ||
      body.customStatus !== undefined
    ) {
      const statusData: Record<string, unknown> = {};
      if (body.statusEmoji !== undefined) statusData.statusEmoji = body.statusEmoji;
      if (body.statusText !== undefined) statusData.statusText = body.statusText;
      if (body.statusExpiresAt !== undefined) statusData.statusExpiresAt = body.statusExpiresAt ? new Date(body.statusExpiresAt) : null;
      if (body.customStatus !== undefined) statusData.customStatus = body.customStatus;

      await prisma.user.update({ where: { id: user.id }, data: statusData });
    }

    // Handle phone update
    if (body.phone !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: body.phone },
      });
    }

    // Handle stealth mode update
    if (body.stealthMode !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stealthMode: body.stealthMode },
      });
    }

    // Handle banner URL update
    if (body.bannerUrl !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { bannerUrl: body.bannerUrl },
      });
    }

    // Handle animated avatar URL update
    if (body.animatedAvatarUrl !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { animatedAvatarUrl: body.animatedAvatarUrl },
      });
    }

    // Handle accent color update (premium-gated)
    if (body.accentColor !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { accentColor: body.accentColor },
      });
    }

    // Handle interests update
    if (body.interests !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { interests: body.interests },
      });
    }

    return ok(updated);
  } catch (err) {
    return fail(err);
  }
}

const deleteSchema = z.object({
  password: z.string().min(1),
  reason: z.string().max(500).optional(),
});

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, deleteSchema);

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!fullUser?.passwordHash) throw new HttpError(404, "user_not_found");

    const valid = await bcrypt.compare(body.password, fullUser.passwordHash);
    if (!valid) throw new HttpError(403, "wrong_password");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        deletedReason: body.reason ?? null,
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: "account_deletion_requested",
        details: { reason: body.reason ?? null },
      },
    });

    sendServiceMessage({
      userId: user.id,
      serviceType: "SECURITY",
      content:
        "Аккаунт помечен на удаление. Через 30 дней он будет удалён окончательно.",
    }).catch(console.error);

    return ok({ message: "Account marked for deletion" });
  } catch (err) {
    return fail(err);
  }
}
