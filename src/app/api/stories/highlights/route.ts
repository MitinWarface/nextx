/**
 * GET /api/stories/highlights?authorId=...
 * Возвращает сторис с highlightName, сгруппированные по highlightName.
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ok, fail, requireUser } from "@/lib/api-helpers";
import { storyToDTO, type StoryDTO } from "@/services/story-service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get("authorId");
    if (!authorId) return fail(new Error("authorId_required"));

    const stories = await prisma.story.findMany({
      where: {
        authorId,
        highlightName: { not: null },
        expiresAt: { gt: new Date() },
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const dtos = stories.map((s) => storyToDTO(s as any, user!.id));

    // Группировка по highlightName
    const groups = new Map<string, StoryDTO[]>();
    for (const dto of dtos) {
      const name = dto.highlightName ?? "Highlights";
      const g = groups.get(name);
      if (g) g.push(dto);
      else groups.set(name, [dto]);
    }

    const result = Array.from(groups.entries()).map(([name, items]) => ({
      name,
      stories: items,
      coverUrl: items[0]?.mediaUrl ?? null,
    }));

    return ok({ highlights: result });
  } catch (err) {
    return fail(err);
  }
}
