import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const interest = req.nextUrl.searchParams.get("interest");
    if (!interest || interest.trim().length === 0) {
      throw new HttpError(400, "interest param required");
    }
    const limit = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20, 1),
      50,
    );
    const offset = Math.max(parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10) || 0, 0);

    const users = await prisma.user.findMany({
      where: {
        interests: { has: interest.trim() },
        deletedAt: null,
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        interests: true,
        reputation: true,
      },
      orderBy: { reputation: "desc" },
      skip: offset,
      take: limit,
    });

    const total = await prisma.user.count({
      where: {
        interests: { has: interest.trim() },
        deletedAt: null,
        isBanned: false,
      },
    });

    return ok({ users, total });
  } catch (err) {
    return fail(err);
  }
}
