import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const status = searchParams.get("status") ?? "open";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const where: any = {};
    if (status && ["open", "in_progress", "completed", "cancelled"].includes(status)) where.status = status;
    if (type && ["looking_for_team", "looking_for_members"].includes(type)) where.type = type;
    if (category && ["development", "design", "marketing", "video", "other"].includes(category)) where.category = category;

    const [listings, total] = await Promise.all([
      prisma.teamExchange.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.teamExchange.count({ where }),
    ]);

    return ok({ listings, total, page, limit });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json();
    const { title, description, type, category, skills, budget, deadline } = body as {
      title: string;
      description: string;
      type: string;
      category: string;
      skills?: string[];
      budget?: number | null;
      deadline?: string | null;
    };

    if (!title || title.length < 3) throw new HttpError(400, "title_too_short");
    if (!description || description.length < 10) throw new HttpError(400, "description_too_short");
    if (!type || !["looking_for_team", "looking_for_members"].includes(type)) throw new HttpError(400, "invalid_type");
    if (!category || !["development", "design", "marketing", "video", "other"].includes(category)) throw new HttpError(400, "invalid_category");

    const listing = await prisma.teamExchange.create({
      data: {
        creatorId: user!.id,
        title,
        description,
        type,
        category,
        skills: skills ?? [],
        budget: budget ?? null,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return created({ listing });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
