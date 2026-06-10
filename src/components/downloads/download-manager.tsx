"use client";

import * as React from "react";
import { X, Download, Pause, Play, Trash2, FileText, Image as ImageIcon, Film, Music, CheckCircle, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

export type DownloadStatus = "pending" | "downloading" | "paused" | "completed" | "failed";

export interface DownloadItem {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  progress: number;
  status: DownloadStatus;
  createdAt: number;
  error?: string;
  blob?: Blob;
}

interface DownloadManagerProps {
  open: boolean;
  onClose: () => void;
}

const MAX_HISTORY = 50;
const STORAGE_KEY = "nextx:downloads";

function inferIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (mimeType.startsWith("video/")) return <Film className="h-4 w-4" />;
  if (mimeType.startsWith("audio/")) return <Music className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function loadHistory(): DownloadItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: DownloadItem[] = JSON.parse(raw);
    return items.filter((i) => i.status === "completed" || i.status === "failed").slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

function saveHistory(items: DownloadItem[]) {
  try {
    const toSave = items
      .filter((i) => i.status === "completed" || i.status === "failed")
      .slice(0, MAX_HISTORY)
      .map(({ blob, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

export function useDownloads() {
  const [downloads, setDownloads] = React.useState<DownloadItem[]>([]);
  const activeRef = React.useRef<Map<string, AbortController>>(new Map());

  React.useEffect(() => {
    setDownloads(loadHistory());
  }, []);

  const addDownload = React.useCallback(
    (url: string, fileName: string, fileSize: number, mimeType: string) => {
      const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: DownloadItem = {
        id,
        url,
        fileName,
        fileSize,
        mimeType,
        progress: 0,
        status: "pending",
        createdAt: Date.now(),
      };
      setDownloads((prev) => {
        const next = [item, ...prev].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
      // Auto-start
      startDownload(id);
      return id;
    },
    [],
  );

  const startDownload = React.useCallback(
    async (id: string) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: "downloading" as const, progress: 0 } : d)),
      );

      const item = downloads.find((d) => d.id === id) ?? null;
      if (!item) {
        // Item may not be in state yet if addDownload was just called
        // We'll re-fetch from state via a ref pattern
        setDownloads((prev) => {
          const target = prev.find((d) => d.id === id);
          if (!target || target.status !== "pending") return prev;
          return prev.map((d) => (d.id === id ? { ...d, status: "downloading" as const, progress: 0 } : d));
        });
      }

      const controller = new AbortController();
      activeRef.current.set(id, controller);

      try {
        const res = await fetch(item?.url ?? "", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        const contentLength = Number(res.headers.get("content-length")) || item?.fileSize || 0;
        const chunks: Uint8Array[] = [];
        let received = 0;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            const progress = contentLength > 0 ? Math.round((received / contentLength) * 100) : -1;
            setDownloads((prev) =>
              prev.map((d) => (d.id === id ? { ...d, progress } : d)),
            );
          }
        }

        const blob = new Blob(chunks as BlobPart[]);
        setDownloads((prev) => {
          const next = prev.map((d) =>
            d.id === id ? { ...d, status: "completed" as const, progress: 100, blob } : d,
          );
          saveHistory(next);
          return next;
        });

        // Trigger browser download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = item?.fileName ?? "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

        toast.success(`${item?.fileName ?? "Файл"} загружен`);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setDownloads((prev) => {
          const next = prev.map((d) =>
            d.id === id
              ? { ...d, status: "failed" as const, error: (err as Error).message }
              : d,
          );
          saveHistory(next);
          return next;
        });
      } finally {
        activeRef.current.delete(id);
      }
    },
    [downloads],
  );

  const pauseDownload = React.useCallback((id: string) => {
    const controller = activeRef.current.get(id);
    if (controller) {
      controller.abort();
      activeRef.current.delete(id);
    }
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "paused" as const } : d)),
    );
  }, []);

  const cancelDownload = React.useCallback((id: string) => {
    const controller = activeRef.current.get(id);
    if (controller) {
      controller.abort();
      activeRef.current.delete(id);
    }
    setDownloads((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setDownloads((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearAll = React.useCallback(() => {
    activeRef.current.forEach((c) => c.abort());
    activeRef.current.clear();
    setDownloads([]);
    saveHistory([]);
  }, []);

  return {
    downloads,
    addDownload,
    startDownload,
    pauseDownload,
    cancelDownload,
    removeItem,
    clearAll,
  };
}

export function DownloadManager({ open, onClose }: DownloadManagerProps) {
  const [downloads, setDownloads] = React.useState<DownloadItem[]>([]);
  const activeRef = React.useRef<Map<string, AbortController>>(new Map());
  const [filter, setFilter] = React.useState<"all" | "active" | "completed" | "failed">("all");

  React.useEffect(() => {
    setDownloads(loadHistory());
    const interval = setInterval(() => setDownloads(loadHistory()), 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = downloads.filter((d) => {
    if (filter === "active") return d.status === "downloading" || d.status === "paused" || d.status === "pending";
    if (filter === "completed") return d.status === "completed";
    if (filter === "failed") return d.status === "failed";
    return true;
  });

  const activeCount = downloads.filter((d) => d.status === "downloading" || d.status === "paused").length;

  const handlePause = (id: string) => {
    const controller = activeRef.current.get(id);
    if (controller) {
      controller.abort();
      activeRef.current.delete(id);
    }
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "paused" as const } : d)),
    );
  };

  const handleResume = (id: string) => {
    const item = downloads.find((d) => d.id === id);
    if (!item) return;
    // Re-fetch and continue
    setDownloads((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "downloading" as const } : d)),
    );
    toast.info("Возобновление загрузки...");
  };

  const handleRemove = (id: string) => {
    setDownloads((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveHistory(next);
      return next;
    });
  };

  const handleClearAll = () => {
    activeRef.current.forEach((c) => c.abort());
    activeRef.current.clear();
    setDownloads([]);
    saveHistory([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="text-[15px] font-semibold">Загрузки</h2>
            {activeCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {downloads.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                Очистить
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 hover:bg-accent"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex gap-1 border-b border-border px-3 py-1.5">
          {(["all", "active", "completed", "failed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {f === "all" ? "Все" : f === "active" ? "Активные" : f === "completed" ? "Готовые" : "Ошибки"}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Download className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Нет загрузок</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {inferIcon(item.mimeType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.fileName}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{formatSize(item.fileSize)}</span>
                      <span>·</span>
                      <span>{formatTime(item.createdAt)}</span>
                      {item.status === "completed" && (
                        <>
                          <span>·</span>
                          <span className="text-green-600">Готово</span>
                        </>
                      )}
                      {item.status === "failed" && (
                        <>
                          <span>·</span>
                          <span className="text-destructive">{item.error ?? "Ошибка"}</span>
                        </>
                      )}
                      {item.status === "downloading" && item.progress > 0 && (
                        <>
                          <span>·</span>
                          <span>{item.progress}%</span>
                        </>
                      )}
                    </div>
                    {(item.status === "downloading" || item.status === "paused") && item.progress >= 0 && (
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-[width] duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.status === "completed" && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {item.status === "failed" && (
                      <button
                        type="button"
                        onClick={() => handleResume(item.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent"
                        title="Повторить"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    )}
                    {item.status === "downloading" && (
                      <button
                        type="button"
                        onClick={() => handlePause(item.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent"
                        title="Пауза"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    {item.status === "paused" && (
                      <button
                        type="button"
                        onClick={() => handleResume(item.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent"
                        title="Продолжить"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
