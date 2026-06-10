import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, created, HttpError } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const tab = searchParams.get("tab") ?? "my";

    const where: any = {};
    if (tab === "my") {
      where.OR = [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ];
    } else if (tab === "discover") {
      where.isPublic = true;
      where.ownerId = { not: user.id };
      where.members = { none: { userId: user.id } };
    }

    if (search) {
      where.AND = where.AND ?? [];
      where.AND.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const [spaces, total] = await Promise.all([
      prisma.space.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          isPublic: true,
          createdAt: true,
          owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { members: true, channels: true } },
        },
      }),
      prisma.space.count({ where }),
    ]);

    return ok({ spaces, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") ?? undefined;
    const user = await getCurrentUser(cookieHeader);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await req.json();
    const { name, description, icon, isPublic } = body as {
      name: string;
      description?: string;
      icon?: string;
      isPublic?: boolean;
    };

    if (!name || name.trim().length === 0) {
      throw new HttpError(400, "name_required");
    }

    const space = await prisma.space.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || null,
        ownerId: user.id,
        isPublic: isPublic ?? false,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
        channels: {
          create: {
            name: "general",
            type: "text",
            position: 0,
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        isPublic: true,
        createdAt: true,
      },
    });

    return created({ space });
  } catch (err) {
    return fail(err);
  }
}
