"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { FileBrowser } from "@/components/cloud/file-browser";
import { RecentFiles } from "@/components/cloud/recent-files";
import { toast } from "@/store/toast-store";
import { Clock } from "lucide-react";

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

interface Breadcrumb {
  id: string | null;
  name: string;
}

export default function CloudPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();

  const [files, setFiles] = React.useState<CloudFile[]>([]);
  const [folders, setFolders] = React.useState<CloudFolderItem[]>([]);
  const [stats, setStats] = React.useState<CloudStats | null>(null);
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = React.useState<Breadcrumb[]>([]);
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [activeCategory, setActiveCategory] = React.useState<ActiveCategory>("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [recentOpen, setRecentOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolderId) params.set("folderId", currentFolderId);
      if (activeCategory !== "all") params.set("category", activeCategory);

      const [cloudRes, statsRes] = await Promise.all([
        fetch(`/api/cloud?${params}`, { credentials: "include" }),
        fetch("/api/cloud/stats", { credentials: "include" }),
      ]);

      if (cloudRes.ok) {
        const data = await cloudRes.json();
        setFiles(data.files ?? []);
        setFolders(data.folders ?? []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch {
      toast.error("Не удалось загрузить данные");
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId, activeCategory]);

  React.useEffect(() => {
    if (user) void loadData();
  }, [user, loadData]);

  const loadBreadcrumbs = React.useCallback(async (folderId: string | null) => {
    if (!folderId) {
      setBreadcrumbs([]);
      return;
    }
    try {
      const crumbs: Breadcrumb[] = [];
      let currentId: string | null = folderId;
      while (currentId) {
        const res = await fetch(`/api/cloud?folderId=${currentId}`, { credentials: "include" });
        if (!res.ok) break;
        const data = await res.json();
        // Find the folder name from parent context or make a simple request
        // For simplicity, we use a dedicated approach
        currentId = null; // Will be handled by direct folder lookup
      }
      // Simple approach: store parent chain as we navigate
    } catch {
      // ignore
    }
  }, []);

  const navigateFolder = React.useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      if (folderId) {
        // Find folder name from current folders list or add generic name
        const folder = folders.find((f) => f.id === folderId);
        const name = folder?.name ?? "Папка";
        setBreadcrumbs((prev) => {
          // If going back, trim
          const existingIdx = prev.findIndex((b) => b.id === folderId);
          if (existingIdx >= 0) return prev.slice(0, existingIdx + 1);
          return [...prev, { id: folderId, name }];
        });
      } else {
        setBreadcrumbs([]);
      }
    },
    [folders],
  );

  const handleCategoryChange = React.useCallback((cat: ActiveCategory) => {
    setActiveCategory(cat);
    setCurrentFolderId(null);
    setBreadcrumbs([]);
  }, []);

  const uploadFiles = React.useCallback(
    async (fileList: FileList | File[]) => {
      setUploading(true);
      let successCount = 0;
      for (const file of Array.from(fileList)) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          if (currentFolderId) fd.append("folderId", currentFolderId);

          const res = await fetch("/api/cloud/files/upload", {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          if (res.ok) successCount++;
        } catch {
          // continue with other files
        }
      }
      if (successCount > 0) {
        toast.success(`Загружено файлов: ${successCount}`);
        void loadData();
      }
      setUploading(false);
    },
    [currentFolderId, loadData],
  );

  const handleUpload = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        void uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles],
  );

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        void uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  const handleCreateFolder = React.useCallback(async () => {
    const name = prompt("Имя папки:");
    if (!name?.trim()) return;
    try {
      const res = await fetch("/api/cloud/folders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentId: currentFolderId }),
      });
      if (res.ok) {
        toast.success("Папка создана");
        void loadData();
      } else {
        toast.error("Не удалось создать папку");
      }
    } catch {
      toast.error("Не удалось создать папку");
    }
  }, [currentFolderId, loadData]);

  const handleDeleteFile = React.useCallback(
    async (fileId: string) => {
      if (!confirm("Удалить файл?")) return;
      try {
        const res = await fetch(`/api/cloud/files/${fileId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          toast.success("Файл удалён");
          void loadData();
        } else {
          toast.error("Не удалось удалить файл");
        }
      } catch {
        toast.error("Не удалось удалить файл");
      }
    },
    [loadData],
  );

  const handleDeleteFolder = React.useCallback(
    async (folderId: string) => {
      if (!confirm("Удалить папку и всё её содержимое?")) return;
      try {
        const res = await fetch(`/api/cloud/folders/${folderId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          toast.success("Папка удалена");
          void loadData();
        } else {
          toast.error("Не удалось удалить папку");
        }
      } catch {
        toast.error("Не удалось удалить папку");
      }
    },
    [loadData],
  );

  const handleDownloadFile = React.useCallback((file: CloudFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  if (userLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col bg-background text-foreground"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary bg-card p-12">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium">Перетащите файлы сюда</p>
          </div>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
          Загрузка файлов...
        </div>
      )}

      <RecentFiles open={recentOpen} onClose={() => setRecentOpen(false)} />

      <FileBrowser
        files={files}
        folders={folders}
        stats={stats}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        breadcrumbs={breadcrumbs}
        onNavigateFolder={navigateFolder}
        onUpload={handleUpload}
        onCreateFolder={handleCreateFolder}
        onDeleteFile={handleDeleteFile}
        onDeleteFolder={handleDeleteFolder}
        onDownloadFile={handleDownloadFile}
        onOpenRecent={() => setRecentOpen(true)}
        isLoading={isLoading}
      />
    </div>
  );
}
