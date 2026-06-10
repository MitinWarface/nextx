"use client";

import * as React from "react";
import {
  X,
  Clock,
  Image,
  Video,
  FileText,
  Music,
  File,
  Download,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface RecentFile {
  id: string;
  userId: string;
  folderId: string | null;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  createdAt: string;
  folder?: { id: string; name: string } | null;
}

type TabKey = "all" | "photo" | "video" | "document" | "audio";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "photo", label: "Фото" },
  { key: "video", label: "Видео" },
  { key: "document", label: "Документы" },
  { key: "audio", label: "Музыка" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getFileIcon(category: string, className?: string): React.ReactNode {
  switch (category) {
    case "photo":
      return <Image className={cn("text-blue-500", className)} />;
    case "video":
      return <Video className={cn("text-purple-500", className)} />;
    case "document":
      return <FileText className={cn("text-orange-500", className)} />;
    case "audio":
      return <Music className={cn("text-green-500", className)} />;
    default:
      return <File className={cn("text-gray-500", className)} />;
  }
}

function isImageFile(file: RecentFile): boolean {
  return file.category === "photo" || /^image\//.test(file.mimeType);
}

interface RecentFilesProps {
  open: boolean;
  onClose: () => void;
}

export function RecentFiles({ open, onClose }: RecentFilesProps) {
  const [files, setFiles] = React.useState<RecentFile[]>([]);
  const [activeTab, setActiveTab] = React.useState<TabKey>("all");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (activeTab !== "all") params.set("category", activeTab);

    fetch(`/api/cloud/recent?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setFiles(data.files ?? []))
      .catch(() => toast.error("Не удалось загрузить недавние файлы"))
      .finally(() => setIsLoading(false));
  }, [open, activeTab]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDownload = React.useCallback((file: RecentFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleOpenFolder = React.useCallback(
    (file: RecentFile) => {
      if (file.folderId) {
        window.open(`/cloud?folderId=${file.folderId}`, "_blank");
      } else {
        window.open("/cloud", "_blank");
      }
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative flex h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Недавние файлы</h2>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-4 py-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Загрузка...
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <File className="mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">Нет файлов</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  {isImageFile(file) ? (
                    <div className="mb-2 h-16 w-16 overflow-hidden rounded-md">
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-md bg-secondary">
                      {getFileIcon(file.category, "h-8 w-8")}
                    </div>
                  )}
                  <span className="w-full truncate text-center text-xs font-medium">
                    {file.filename}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(file.createdAt)}
                  </span>
                  {file.folder && (
                    <span className="mt-1 max-w-full truncate text-[10px] text-muted-foreground">
                      {file.folder.name}
                    </span>
                  )}
                  <div className="mt-2 flex w-full gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-[10px] h-7"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Скачать
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleOpenFolder(file)}
                      title="Открыть папку"
                    >
                      <FolderOpen className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
