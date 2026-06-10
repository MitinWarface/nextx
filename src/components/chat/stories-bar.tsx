"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

export interface StoryItem {
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

interface StoriesBarProps {
  stories: StoryItem[];
  myUserId: string;
  myAvatarUrl: string | null;
  myDisplayName: string;
  onOpenStory: (group: StoryGroup) => void;
  onCreateStory: () => void;
  loading?: boolean;
}

export interface StoryGroup {
  author: StoryItem["author"];
  channelId?: string | null;
  stories: StoryItem[];
  allViewed: boolean;
}

function groupStories(items: StoryItem[]): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const s of items) {
    // Use channelId as grouping key for channel stories, authorId for user stories
    const key = s.channelId ?? s.authorId;
    const g = map.get(key);
    if (g) {
      g.stories.push(s);
    } else {
      map.set(key, {
        author: s.author,
        channelId: s.channelId ?? null,
        stories: [s],
        allViewed: false,
      });
    }
  }
  // Сортировка: сначала непрочитанные, потом свои
  const groups = Array.from(map.values()).map((g) => ({
    ...g,
    allViewed: g.stories.every((s) => s.viewedByMe),
  }));
  return groups.sort((a, b) => {
    if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
    const aMax = Math.max(...a.stories.map((s) => +new Date(s.createdAt)));
    const bMax = Math.max(...b.stories.map((s) => +new Date(s.createdAt)));
    return bMax - aMax;
  });
}

export function StoriesBar({
  stories,
  myUserId,
  myAvatarUrl,
  myDisplayName,
  onOpenStory,
  onCreateStory,
  loading = false,
}: StoriesBarProps) {
  const groups = React.useMemo(() => groupStories(stories), [stories]);
  // Своя отдельная группа
  const myStories = groups.find((g) => g.author.id === myUserId) ?? null;
  const otherGroups = groups.filter((g) => g.author.id !== myUserId);

  return (
    <div className="border-b border-sidebar-border bg-sidebar px-2 py-2">
      <div className="flex gap-2 overflow-x-auto">
        {/* Кнопка «Добавить story» */}
        <button
          type="button"
          onClick={onCreateStory}
          disabled={loading}
          className="group relative flex w-16 shrink-0 flex-col items-center gap-1"
          aria-label="Опубликовать историю"
        >
          <div className="relative">
            {loading ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <Avatar
                name={myDisplayName}
                src={myAvatarUrl}
                size="lg"
              />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-sidebar bg-primary text-primary-foreground">
              <Plus className="h-3 w-3" />
            </span>
          </div>
          <span className="line-clamp-1 text-[10px] font-medium text-muted-foreground">
            Моя история
          </span>
        </button>

        {/* Мои существующие stories (если есть) */}
        {myStories && myStories.stories.length > 0 && (
          <StoryAvatar
            group={myStories}
            onClick={() => onOpenStory(myStories)}
          />
        )}

        {/* Другие пользователи */}
        {otherGroups.length === 0 && !loading && (
          <div className="flex flex-1 items-center pl-2 text-[11px] text-muted-foreground">
            Нет историй от контактов
          </div>
        )}
        {otherGroups.map((g) => (
          <StoryAvatar
            key={g.author.id}
            group={g}
            onClick={() => onOpenStory(g)}
          />
        ))}
      </div>
    </div>
  );
}

function StoryAvatar({
  group,
  onClick,
}: {
  group: StoryGroup;
  onClick: () => void;
}) {
  const { author, allViewed, stories, channelId } = group;
  const displayName = channelId ? (author.displayName || "Канал") : author.displayName;
  const handleClick = () => {
    if (stories.length === 0) {
      toast.info("Историй пока нет");
      return;
    }
    onClick();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-16 shrink-0 flex-col items-center gap-1 transition-opacity active:scale-95"
      aria-label={`История от ${displayName}`}
    >
      <div
        className={cn(
          "relative rounded-full p-0.5",
          allViewed
            ? "bg-muted-foreground/30"
            : "bg-primary",
        )}
      >
        <Avatar
          name={displayName}
          src={author.avatarUrl}
          size="lg"
          className="border-2 border-sidebar"
        />
      </div>
      <span className="line-clamp-1 w-full text-center text-[10px] font-medium text-foreground">
        {displayName.split(" ")[0]}
      </span>
    </button>
  );
}
