/**
 * Admin authorization middleware and helpers.
 */
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { HttpError } from "@/lib/api-helpers";
import type { UserRole } from "@prisma/client";
import { hasAccess, type SECTION as Section, type AdminRole } from "@/lib/admin-permissions";

export async function requireAdmin(cookieHeader?: string): Promise<{ id: string; role: UserRole }> {
  const user = await getCurrentUser(cookieHeader);
  if (!user) throw new HttpError(401, "unauthorized");

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });

  if (!fullUser) throw new HttpError(401, "user_not_found");
  if (fullUser.role === "USER") throw new HttpError(403, "forbidden");

  return fullUser;
}

export async function requireSectionAccess(
  section: Section,
  cookieHeader?: string,
): Promise<{ id: string; role: UserRole }> {
  const admin = await requireAdmin(cookieHeader);
  if (!hasAccess(admin.role as AdminRole, section, "read")) {
    throw new HttpError(403, `access_denied:${section}`);
  }
  return admin;
}

export async function requireSectionManage(
  section: Section,
  cookieHeader?: string,
): Promise<{ id: string; role: UserRole }> {
  const admin = await requireAdmin(cookieHeader);
  if (!hasAccess(admin.role as AdminRole, section, "manage")) {
    throw new HttpError(403, `access_denied:${section}`);
  }
  return admin;
}

export async function requireSuperAdmin(cookieHeader?: string): Promise<{ id: string; role: UserRole }> {
  const user = await requireAdmin(cookieHeader);
  if (user.role !== "SUPER_ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden");
  return user;
}

export async function logAudit(
  actorId: string,
  action: import("@prisma/client").AuditAction,
  target?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      target: target ?? null,
      details: details !== undefined ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}
