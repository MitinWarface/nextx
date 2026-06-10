/**
 * GET /api/users — список пользователей (для пикера в модалках).
 * Исключает текущего пользователя. Поддерживает ?q= для поиска.
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const me = currentUser!;
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const skillsParam = (searchParams.get("skills") ?? "").trim();
    const location = (searchParams.get("location") ?? "").trim();

    const skills = skillsParam
      ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const users = await prisma.user.findMany({
      where: {
        id: { not: me.id },
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(skills.length > 0
          ? { skills: { hasSome: skills } }
          : {}),
        ...(location
          ? { location: { contains: location, mode: "insensitive" } }
          : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        lastSeenAt: true,
        skills: true,
        location: true,
      },
      orderBy: [{ displayName: "asc" }],
      take: 100,
    });

    return ok({
      users: users.map((u) => ({
        ...u,
        lastSeenAt: u.lastSeenAt.toISOString(),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
