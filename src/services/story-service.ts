/**
 * Сервис Stories: создание, лента активных, просмотр, удаление.
 * Stories живут 24 часа (TTL).
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoryDTO {
  id: string;
  authorId: string;
  channelId?: string | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  viewedByMe: boolean;
  highlightName: string | null;
}

interface ListOptions {
  viewerId: string;
  limit?: number;
}

export function storyToDTO(
  s: {
    id: string;
    authorId: string;
    channelId?: string | null;
    mediaUrl: string;
    mediaType: "IMAGE" | "VIDEO";
    caption: string | null;
    createdAt: Date;
    expiresAt: Date;
    highlightName: string | null;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    _count: { views: number };
  },
  viewerId: string,
  viewedSet?: Set<string>,
): StoryDTO {
  return {
    id: s.id,
    authorId: s.authorId,
    channelId: s.channelId ?? null,
    author: s.author,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType,
    caption: s.caption,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    viewCount: s._count.views,
    viewedByMe: viewedSet?.has(s.id) ?? false,
    highlightName: s.highlightName,
  };
}

/**
 * Получить активные stories от пользователей, у которых есть чат с viewerId,
 * плюс свои. Сгруппировано по author: возвращаем все stories одного автора.
 */
export async function listActiveStories({
  viewerId,
  limit = 200,
}: ListOptions): Promise<StoryDTO[]> {
  const now = new Date();
  // Сначала все "свежие" stories
  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: now },
      OR: [
        { authorId: viewerId },
        {
          author: {
            OR: [
              // пользователи, с которыми у меня есть приватный чат
              {
                participants: {
                  some: {
                    chat: {
                      type: "PRIVATE",
                      participants: { some: { userId: viewerId } },
                    },
                  },
                },
              },
              // пользователи из общих групп
              {
                participants: {
                  some: {
                    chat: {
                      type: "GROUP",
                      participants: { some: { userId: viewerId } },
                    },
                  },
                },
              },
            ],
          },
        },
        // Channel stories: user is a participant of the channel
        {
          channelId: {
            not: null,
          },
          channel: {
            participants: {
              some: { userId: viewerId },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: { select: { views: true } },
    },
  });
  if (stories.length === 0) return [];
  const storyIds = stories.map((s) => s.id);
  const myViews = await prisma.storyView.findMany({
    where: { storyId: { in: storyIds }, viewerId },
    select: { storyId: true },
  });
  const viewedSet = new Set(myViews.map((v) => v.storyId));
  return stories.map((s) => storyToDTO(s as any, viewerId, viewedSet));
}

export interface CreateStoryInput {
  authorId: string;
  channelId?: string | null;
  mediaUrl: string;
  mediaType?: "IMAGE" | "VIDEO";
  caption?: string | null;
}

export async function createStory(input: CreateStoryInput): Promise<StoryDTO> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STORY_TTL_MS);
  const created = await prisma.story.create({
    data: {
      authorId: input.authorId,
      channelId: input.channelId ?? null,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType ?? "IMAGE",
      caption: input.caption ?? null,
      expiresAt,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: { select: { views: true } },
    },
  });
  return storyToDTO(created, input.authorId, new Set());
}

export async function markStoryViewed(
  storyId: string,
  viewerId: string,
): Promise<void> {
  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId, viewerId } },
    create: { storyId, viewerId },
    update: { viewedAt: new Date() },
  });
}

export async function deleteStory(
  storyId: string,
  authorId: string,
): Promise<boolean> {
  const res = await prisma.story.deleteMany({
    where: { id: storyId, authorId },
  });
  return res.count > 0;
}

export async function getStoryViewers(
  storyId: string,
  authorId: string,
): Promise<
  Array<{ id: string; username: string; displayName: string; avatarUrl: string | null; viewedAt: string }>
> {
  const story = await prisma.story.findFirst({
    where: { id: storyId, authorId },
    select: { id: true },
  });
  if (!story) return [];
  const views = await prisma.storyView.findMany({
    where: { storyId },
    orderBy: { viewedAt: "desc" },
    include: {
      viewer: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });
  return views.map((v) => ({
    ...v.viewer,
    viewedAt: v.viewedAt.toISOString(),
  }));
}

export type { Prisma };
