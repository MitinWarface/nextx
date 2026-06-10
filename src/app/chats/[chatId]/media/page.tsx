"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, X, ChevronLeft, ChevronRight, Image as ImageIcon, Film, FileText, Music, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaMessage {
  id: string;
  type: "IMAGE" | "VIDEO" | "FILE" | "AUDIO" | "VOICE";
  mediaUrl: string;
  thumbnailUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  sender: { id: string; displayName: string; username: string };
}

type Tab = "ALL" | "IMAGE" | "VIDEO" | "FILE" | "AUDIO" | "VOICE";

export default function MediaGalleryPage() {
  const params = useParams<{ chatId: string }>();
  const router = useRouter();
  const chatId = params?.chatId ?? "";
  const [tab, setTab] = React.useState<Tab>("ALL");
  const [items, setItems] = React.useState<MediaMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/chats/${chatId}/media?type=${tab}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed");
        const data = (await r.json()) as { messages: MediaMessage[] };
        if (!cancelled) setItems(data.messages);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chatId, tab]);

  const lightboxItem = lightboxIdx != null ? items[lightboxIdx] : null;

  React.useEffect(() => {
    if (lightboxIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      else if (e.key === "ArrowLeft")
        setLightboxIdx((i) => (i == null ? null : Math.max(0, i - 1)));
      else if (e.key === "ArrowRight")
        setLightboxIdx((i) =>
          i == null ? null : Math.min(items.length - 1, i + 1),
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, items.length]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[15px] font-semibold">Медиа чата</h1>
        <span className="text-xs text-muted-foreground">· {items.length}</span>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
        <TabBtn active={tab === "ALL"} onClick={() => setTab("ALL")}>
          Все
        </TabBtn>
        <TabBtn
          active={tab === "IMAGE"}
          onClick={() => setTab("IMAGE")}
          icon={<ImageIcon className="h-3.5 w-3.5" />}
        >
          Фото
        </TabBtn>
        <TabBtn
          active={tab === "VIDEO"}
          onClick={() => setTab("VIDEO")}
          icon={<Film className="h-3.5 w-3.5" />}
        >
          Видео
        </TabBtn>
        <TabBtn
          active={tab === "FILE"}
          onClick={() => setTab("FILE")}
          icon={<FileText className="h-3.5 w-3.5" />}
        >
          Документы
        </TabBtn>
        <TabBtn
          active={tab === "AUDIO"}
          onClick={() => setTab("AUDIO")}
          icon={<Music className="h-3.5 w-3.5" />}
        >
          Музыка
        </TabBtn>
        <TabBtn
          active={tab === "VOICE"}
          onClick={() => setTab("VOICE")}
          icon={<Mic className="h-3.5 w-3.5" />}
        >
          Голосовые
        </TabBtn>
      </div>

      {/* Grid / List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загружаем…
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            В этом чате пока нет медиа
          </div>
        ) : tab === "FILE" || tab === "AUDIO" || tab === "VOICE" || (tab === "ALL" && items.some((m) => m.type === "FILE" || m.type === "AUDIO" || m.type === "VOICE")) ? (
          <div className="flex flex-col gap-1">
            {items.map((m) => (
              <FileRow key={m.id} item={m} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLightboxIdx(i)}
                className="group relative aspect-square overflow-hidden rounded-md bg-muted"
              >
                {m.type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.thumbnailUrl ?? m.mediaUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="relative h-full w-full">
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <video
                        src={m.mediaUrl}
                        className="h-full w-full object-cover"
                        muted
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Film className="h-6 w-6 text-white drop-shadow" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setLightboxIdx(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {lightboxItem.sender.displayName}
              </div>
              <div className="truncate text-[11px] text-white/60">
                {new Date(lightboxItem.createdAt).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(null);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxItem.type === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightboxItem.mediaUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                src={lightboxItem.mediaUrl}
                controls
                autoPlay
                className="max-h-full max-w-full"
              />
            )}
            {lightboxIdx! > 0 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIdx((i) => (i == null ? null : i - 1))
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Предыдущее"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {lightboxIdx! < items.length - 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIdx((i) =>
                    i == null ? null : Math.min(items.length - 1, i + 1),
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Следующее"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="px-4 py-2 text-center text-[11px] text-white/50">
            {lightboxIdx! + 1} из {items.length}
          </div>
        </div>
      )}
    </div>
  );
}

function FileRow({ item }: { item: MediaMessage }) {
  const Icon =
    item.type === "AUDIO"
      ? Music
      : item.type === "VOICE"
        ? Mic
        : FileText;
  const label =
    item.type === "AUDIO"
      ? "Аудио"
      : item.type === "VOICE"
        ? "Голосовое"
        : "Документ";
  return (
    <a
      href={item.mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:bg-accent"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {item.fileName ?? label}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {item.sender.displayName} · {new Date(item.createdAt).toLocaleDateString()}
          {item.fileSize != null && ` · ${formatSize(item.fileSize)}`}
        </div>
      </div>
    </a>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function TabBtn({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
