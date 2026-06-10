"use client";

import * as React from "react";
import { X, FileText, Image as ImageIcon, Film, Music, Download, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

type FileType = "ALL" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

interface FileItem {
  id: string;
  type: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  content: string | null;
  createdAt: string;
  sender?: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  chat: {
    id: string;
    name: string | null;
    type: string;
    avatarUrl: string | null;
  };
}

interface RecentFilesModalProps {
  open: boolean;
  onClose: () => void;
  onInsertFile?: (url: string, fileName: string) => void;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getTypeIcon(type: string) {
  if (type === "IMAGE") return <ImageIcon className="h-4 w-4" />;
  if (type === "VIDEO") return <Film className="h-4 w-4" />;
  if (type === "AUDIO") return <Music className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function getTypeLabel(type: string) {
  if (type === "IMAGE") return "Фото";
  if (type === "VIDEO") return "Видео";
  if (type === "AUDIO") return "Аудио";
  return "Файл";
}

export function RecentFilesModal({ open, onClose, onInsertFile }: RecentFilesModalProps) {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<FileType>("ALL");

  const fetchFiles = React.useCallback(async (type: FileType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/me/recent-files?type=${type}&limit=50`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files ?? []);
      }
    } catch {
      toast.error("Не удалось загрузить файлы");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) fetchFiles(filter);
  }, [open, filter, fetchFiles]);

  const handleDownload = (file: FileItem) => {
    if (!file.mediaUrl) return;
    const a = document.createElement("a");
    a.href = file.mediaUrl;
    a.download = file.fileName ?? "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleInsert = (file: FileItem) => {
    if (!file.mediaUrl) return;
    onInsertFile?.(file.mediaUrl, file.fileName ?? "file");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold">Недавние файлы</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex gap-1 border-b border-border px-3 py-1.5">
          {([
            ["ALL", "Все"],
            ["IMAGE", "Фото"],
            ["VIDEO", "Видео"],
            ["AUDIO", "Аудио"],
            ["FILE", "Документы"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilter(val)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Загрузка...
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Нет файлов</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30">
                  {file.mediaUrl && file.type === "IMAGE" && file.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.thumbnailUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      {getTypeIcon(file.type)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {file.fileName ?? getTypeLabel(file.type)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{formatSize(file.fileSize)}</span>
                      <span>·</span>
                      <span>{getTypeLabel(file.type)}</span>
                      <span>·</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      {file.chat && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[100px]">{file.chat.name ?? "Чат"}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {file.mediaUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                        title="Скачать"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {onInsertFile && file.mediaUrl && (
                      <button
                        type="button"
                        onClick={() => handleInsert(file)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                        title="Вставить"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
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
