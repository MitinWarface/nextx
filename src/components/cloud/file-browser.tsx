"use client";

import * as React from "react";
import {
  Folder,
  File,
  Image,
  Video,
  FileText,
  Music,
  Upload,
  Grid3X3,
  List,
  ChevronRight,
  Home,
  Trash2,
  Download,
  MoreVertical,
  FolderPlus,
  HardDrive,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface CloudFile {
  id: string;
  userId: string;
  folderId: string | null;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  createdAt: string;
}

interface CloudFolderItem {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface CloudStats {
  totalSize: number;
  photoCount: number;
  videoCount: number;
  documentCount: number;
  audioCount: number;
  otherCount: number;
  storageLimit: number;
}

type ViewMode = "grid" | "list";
type ActiveCategory = "all" | "photo" | "video" | "document" | "audio";

const CATEGORY_LABELS: Record<ActiveCategory, string> = {
  all: "Все",
  photo: "Фото",
  video: "Видео",
  document: "Документы",
  audio: "Аудио",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  photo: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  audio: <Music className="h-4 w-4" />,
  other: <File className="h-4 w-4" />,
};

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

interface Breadcrumb {
  id: string | null;
  name: string;
}

interface FileBrowserProps {
  files: CloudFile[];
  folders: CloudFolderItem[];
  stats: CloudStats | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activeCategory: ActiveCategory;
  onCategoryChange: (cat: ActiveCategory) => void;
  breadcrumbs: Breadcrumb[];
  onNavigateFolder: (folderId: string | null) => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDownloadFile: (file: CloudFile) => void;
  onOpenRecent?: () => void;
  isLoading: boolean;
}

export function FileBrowser({
  files,
  folders,
  stats,
  viewMode,
  onViewModeChange,
  activeCategory,
  onCategoryChange,
  breadcrumbs,
  onNavigateFolder,
  onUpload,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  onDownloadFile,
  onOpenRecent,
  isLoading,
}: FileBrowserProps) {
  const [contextMenu, setContextMenu] = React.useState<{
    type: "file" | "folder";
    id: string;
    name: string;
    file?: CloudFile;
    x: number;
    y: number;
  } | null>(null);

  const storagePercent = stats
    ? Math.min(100, (stats.totalSize / stats.storageLimit) * 100)
    : 0;

  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent, type: "file" | "folder", id: string, name: string, file?: CloudFile) => {
      e.preventDefault();
      setContextMenu({ type, id, name, file, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const closeContextMenu = React.useCallback(() => setContextMenu(null), []);

  React.useEffect(() => {
    if (contextMenu) {
      const handler = () => closeContextMenu();
      window.addEventListener("click", handler);
      window.addEventListener("scroll", handler, true);
      return () => {
        window.removeEventListener("click", handler);
        window.removeEventListener("scroll", handler, true);
      };
    }
  }, [contextMenu, closeContextMenu]);

  return (
    <div className="flex h-full flex-col" onClick={closeContextMenu}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Облако</h1>
        </div>
        <div className="flex items-center gap-2">
          {onOpenRecent && (
            <Button variant="ghost" size="icon" onClick={onOpenRecent} title="Недавние">
              <Clock className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onCreateFolder} title="Новая папка">
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button variant="default" size="sm" onClick={onUpload}>
            <Upload className="mr-1 h-4 w-4" />
            Загрузить
          </Button>
        </div>
      </div>

      {/* Storage bar */}
      {stats && (
        <div className="border-b border-border px-4 py-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Использовано: {formatBytes(stats.totalSize)}</span>
            <span>Лимит: {formatBytes(stats.storageLimit)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Categories + View Toggle */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2 overflow-x-auto">
        {(Object.keys(CATEGORY_LABELS) as ActiveCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border px-4 py-2 text-sm overflow-x-auto">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.id ?? "root"}>
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
              <button
                type="button"
                onClick={() => onNavigateFolder(b.id)}
                className={cn(
                  "shrink-0 truncate text-xs hover:text-primary transition-colors",
                  i === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Загрузка...
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Folder className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">Папка пуста</p>
            <p className="text-xs">Нажмите «Загрузить», чтобы добавить файлы</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {/* Folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onNavigateFolder(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, "folder", folder.id, folder.name)}
                className="group flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <Folder className="mb-2 h-10 w-10 text-yellow-500" />
                <span className="w-full truncate text-center text-xs font-medium">
                  {folder.name}
                </span>
              </button>
            ))}
            {/* Files */}
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onDownloadFile(file)}
                onContextMenu={(e) => handleContextMenu(e, "file", file.id, file.filename, file)}
                className="group flex flex-col items-center rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                {getFileIcon(file.category, "mb-2 h-10 w-10")}
                <span className="w-full truncate text-center text-xs font-medium">
                  {file.filename}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="flex flex-col gap-0.5">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => onNavigateFolder(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, "folder", folder.id, folder.name)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <Folder className="h-5 w-5 shrink-0 text-yellow-500" />
                <span className="flex-1 truncate text-sm font-medium">{folder.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onDownloadFile(file)}
                onContextMenu={(e) => handleContextMenu(e, "file", file.id, file.filename, file)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                {getFileIcon(file.category, "h-5 w-5 shrink-0")}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{file.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · {formatDate(file.createdAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "file" && contextMenu.file && (
            <button
              type="button"
              onClick={() => {
                onDownloadFile(contextMenu.file!);
                closeContextMenu();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Скачать
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (contextMenu.type === "file") onDeleteFile(contextMenu.id);
              else onDeleteFolder(contextMenu.id);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}
