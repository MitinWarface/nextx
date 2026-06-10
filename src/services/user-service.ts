/**
 * Бизнес-логика пользователей.
 */
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api-helpers";

export interface UpdateProfileInput {
  userId: string;
  displayName?: string;
  username?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  socialLinks?: { twitter?: string; instagram?: string; github?: string; telegram?: string } | null;
  accountType?: "personal" | "company" | "brand" | "media" | "shop";
  bannerUrl?: string | null;
}

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<{
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
}> {
  const data: Record<string, unknown> = {};

  if (input.displayName !== undefined) {
    const dn = input.displayName.trim();
    if (dn.length < 1 || dn.length > 64) {
      throw new HttpError(400, "invalid_display_name");
    }
    data.displayName = dn;
  }

  if (input.username !== undefined) {
    const u = input.username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) {
      throw new HttpError(400, "invalid_username");
    }
    if (u) {
      const existing = await prisma.user.findUnique({
        where: { username: u },
        select: { id: true },
      });
      if (existing && existing.id !== input.userId) {
        throw new HttpError(409, "username_taken");
      }
    }
    data.username = u;
  }

  if (input.bio !== undefined) {
    if (input.bio !== null && input.bio.length > 280) {
      throw new HttpError(400, "bio_too_long");
    }
    data.bio = input.bio?.trim() || null;
  }

  if (input.avatarUrl !== undefined) {
    data.avatarUrl = input.avatarUrl;
  }

  if (input.website !== undefined) {
    data.website = input.website || null;
  }

  if (input.socialLinks !== undefined) {
    data.socialLinks = input.socialLinks || null;
  }

  if (input.accountType !== undefined) {
    data.accountType = input.accountType;
  }

  if (input.bannerUrl !== undefined) {
    data.bannerUrl = input.bannerUrl;
  }

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, "no_fields_to_update");
  }

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      website: true,
      socialLinks: true,
      accountType: true,
    },
  });

  return updated;
}
