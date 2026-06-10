/**
 * Privacy helper: apply PrivacyMode rules for lastSeen/online/messages.
 */
import { prisma } from "@/lib/prisma";

export type PrivacyMode = "EVERYONE" | "CONTACTS" | "NOBODY";

export async function areContacts(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  // Считаем контактами тех, у кого есть Contact-отношение в любую сторону
  const count = await prisma.contact.count({
    where: {
      OR: [
        { ownerId: a, targetId: b },
        { ownerId: b, targetId: a },
      ],
    },
  });
  return count > 0;
}

export async function canSee(
  mode: PrivacyMode,
  ownerId: string,
  viewerId: string,
): Promise<boolean> {
  if (ownerId === viewerId) return true;
  if (mode === "EVERYONE") return true;
  if (mode === "NOBODY") return false;
  // CONTACTS
  return areContacts(ownerId, viewerId);
}

export async function loadSettings(userId: string) {
  return prisma.privacySettings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export interface MaskableUser {
  id: string;
  avatarUrl: string | null;
  status: string;
  lastSeenAt: Date;
}

/**
 * Маскирует public-поля пользователя по privacy-настройкам для конкретного viewer.
 * Если viewer — сам owner, ничего не маскирует.
 */
export async function maskUserForViewer<T extends MaskableUser>(
  user: T,
  viewerId: string,
): Promise<T> {
  if (user.id === viewerId) return user;
  const settings = await loadSettings(user.id);
  const [canSeePhoto, canSeeLast, canSeeOnline] = await Promise.all([
    canSee(settings.profileVisibility, user.id, viewerId),
    canSee(settings.lastSeenVisibility, user.id, viewerId),
    canSee(settings.onlineVisibility, user.id, viewerId),
  ]);
  return {
    ...user,
    avatarUrl: canSeePhoto ? user.avatarUrl : null,
    status: canSeeOnline ? user.status : "OFFLINE",
    lastSeenAt: canSeeLast ? user.lastSeenAt : new Date(0),
  };
}

