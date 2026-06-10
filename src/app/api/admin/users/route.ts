import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { publicId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isBanned: true,
          isPermabanned: true,
          premiumStatus: true,
          isBot: true,
          createdAt: true,
          lastSeenAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ok({ users, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { userId, role } = body as { userId: string; role?: string };

    if (!userId) {
      throw new HttpError(400, "userId_required");
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, username: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    if (role && role !== target.role) {
      if (admin.role !== "SUPER_ADMIN" && admin.role !== "OWNER" && role === "SUPER_ADMIN") {
        throw new HttpError(403, "cannot_assign_super_admin");
      }

      await logAudit(admin.id, "USER_ROLE_CHANGE", `user:${userId}`, {
        from: target.role,
        to: role,
      });

      await prisma.user.update({ where: { id: userId }, data: { role: role as any } });
    }

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { userId, isBanned, role } = body as { userId: string; isBanned?: boolean; role?: string };

    if (!userId) throw new HttpError(400, "userId_required");

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, username: true, isBanned: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    const updates: any = {};

    if (typeof isBanned === "boolean" && isBanned !== target.isBanned) {
      updates.isBanned = isBanned;
      await logAudit(admin.id, isBanned ? "USER_BAN" : "USER_UNBAN", `user:${userId}`, {
        username: target.username,
      });
    }

    if (role && role !== target.role) {
      if (admin.role !== "SUPER_ADMIN" && admin.role !== "OWNER" && role === "SUPER_ADMIN") {
        throw new HttpError(403, "cannot_assign_super_admin");
      }
      updates.role = role;
      await logAudit(admin.id, "USER_ROLE_CHANGE", `user:${userId}`, {
        from: target.role,
        to: role,
      });
    }

    if (Object.keys(updates).length === 0) {
      throw new HttpError(400, "no_updates");
    }

    await prisma.user.update({ where: { id: userId }, data: updates });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
