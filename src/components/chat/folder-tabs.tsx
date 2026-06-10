"use client";

import * as React from "react";
import { Folder, Plus, X, Hash, Users, Megaphone, Inbox, MessageSquare, Bot, Mail, Filter, Pin, VolumeX, Image, File, CheckCircle, Share2, Link as LinkIcon, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface FolderTab {
  id: string;
  name: string;
  icon: string;
  chatCount?: number;
}

export interface FolderFilter {
  key: string;
  label: string;
  icon: React.ElementType;
}

export const ADVANCED_FILTERS: FolderFilter[] = [
  { key: "unread", label: "Непрочитанные", icon: Mail },
  { key: "media", label: "Медиа", icon: Image },
  { key: "files", label: "Файлы", icon: File },
  { key: "muted", label: "Без звука", icon: VolumeX },
  { key: "pinned", label: "Закреплённые", icon: Pin },
  { key: "group", label: "Группы", icon: Users },
  { key: "channel", label: "Каналы", icon: Megaphone },
  { key: "bot", label: "Боты", icon: Bot },
];

export interface FilterPreset {
  name: string;
  filters: string[];
}

interface FolderTabsProps {
  folders: FolderTab[];
  activeFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  onCreateFolder?: (name: string, chatTypes: string[]) => void;
  onDeleteFolder?: (folderId: string) => void;
  onShareFolder?: (folderId: string) => void;
  activeFilters?: string[];
  onFiltersChange?: (filters: string[]) => void;
  filterPresets?: FilterPreset[];
  onSavePreset?: (preset: FilterPreset) => void;
  onDeletePreset?: (name: string) => void;
  className?: string;
}

const ICONS: Record<string, React.ElementType> = {
  Folder,
  Inbox,
  Hash,
  Users,
  Megaphone,
};

const CHAT_TYPES = [
  { key: "personal", label: "Личные", icon: MessageSquare },
  { key: "group", label: "Группы", icon: Users },
  { key: "channel", label: "Каналы", icon: Megaphone },
  { key: "bot", label: "Боты", icon: Bot },
  { key: "unread", label: "Непрочитанные", icon: Mail },
];

export function FolderTabs({
  folders,
  activeFolderId,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
  onShareFolder,
  activeFilters = [],
  onFiltersChange,
  filterPresets = [],
  onSavePreset,
  onDeletePreset,
  className,
}: FolderTabsProps) {
  const [contextMenu, setContextMenu] = React.useState<{
    folderId: string;
    x: number;
    y: number;
  } | null>(null);

  const [showCreateFolder, setShowCreateFolder] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);

  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [presetName, setPresetName] = React.useState("");
  const [showPresetInput, setShowPresetInput] = React.useState(false);

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setContextMenu({ folderId, x: e.clientX, y: e.clientY });
  };

  React.useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  const handleCreate = () => {
    if (!folderName.trim() || !onCreateFolder) return;
    onCreateFolder(folderName.trim(), selectedTypes);
    setFolderName("");
    setSelectedTypes([]);
    setShowCreateFolder(false);
  };

  const toggleType = (key: string) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  };

  const toggleFilter = (key: string) => {
    if (!onFiltersChange) return;
    onFiltersChange(
      activeFilters.includes(key)
        ? activeFilters.filter((f) => f !== key)
        : [...activeFilters, key],
    );
  };

  const clearFilters = () => {
    onFiltersChange?.([]);
  };

  const handleSavePreset = () => {
    if (!presetName.trim() || activeFilters.length === 0 || !onSavePreset) return;
    onSavePreset({ name: presetName.trim(), filters: [...activeFilters] });
    setPresetName("");
    setShowPresetInput(false);
  };

  const applyPreset = (preset: FilterPreset) => {
    onFiltersChange?.([...preset.filters]);
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-0.5 overflow-x-auto border-b border-sidebar-border px-2 py-1",
          className,
        )}
      >
        {/* Все чаты */}
        <button
          type="button"
          onClick={() => { onSelect(null); clearFilters(); }}
          className={cn(
            "relative shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            activeFolderId === null && !hasActiveFilters
              ? "bg-primary/10 text-primary folder-tab-active"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          Все
        </button>

        {folders.map((f) => {
          const IconComp = ICONS[f.icon] ?? Folder;
          const isActive = activeFolderId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelect(f.id)}
              onContextMenu={(e) => handleContextMenu(e, f.id)}
              className={cn(
                "relative shrink-0 flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary folder-tab-active"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <IconComp className="h-3 w-3" />
              {f.name}
              {f.chatCount !== undefined && f.chatCount > 0 && (
                <Badge variant="outline" className="ml-0.5 h-4 px-1 text-[9px]">
                  {f.chatCount}
                </Badge>
              )}
            </button>
          );
        })}

        {/* Filter button */}
        {onFiltersChange && (
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={cn(
              "shrink-0 rounded-md p-1.5 transition-colors",
              hasActiveFilters
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            title="Фильтры"
          >
            <Filter className="h-3.5 w-3.5" />
            {hasActiveFilters && (
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                {activeFilters.length}
              </span>
            )}
          </button>
        )}

        {onCreateFolder && (
          <button
            type="button"
            onClick={() => setShowCreateFolder(true)}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Создать папку"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Advanced Filter Panel */}
      {showFilterPanel && onFiltersChange && (
        <div className="border-b border-sidebar-border bg-muted/30 px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Фильтры чатов</span>
            <div className="flex items-center gap-1">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => setShowPresetInput(true)}
                  className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
                  title="Сохранить пресет"
                >
                  Сохранить
                </button>
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ADVANCED_FILTERS.map((filter) => {
              const Icon = filter.icon;
              const active = activeFilters.includes(filter.key);
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => toggleFilter(filter.key)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {filter.label}
                  {active && <CheckCircle className="h-2.5 w-2.5" />}
                </button>
              );
            })}
          </div>

          {/* Save preset input */}
          {showPresetInput && (
            <div className="mt-2 flex gap-1.5">
              <input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                placeholder="Название пресета..."
                className="flex-1 rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => { setShowPresetInput(false); setPresetName(""); }}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Filter presets */}
          {filterPresets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filterPresets.map((preset) => (
                <div key={preset.name} className="group flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                      activeFilters.length > 0 && JSON.stringify([...activeFilters].sort()) === JSON.stringify([...preset.filters].sort())
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Filter className="h-2.5 w-2.5" />
                    {preset.name}
                  </button>
                  {onDeletePreset && (
                    <button
                      type="button"
                      onClick={() => onDeletePreset(preset.name)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {onShareFolder && (
            <button
              type="button"
              onClick={() => {
                onShareFolder(contextMenu.folderId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Share2 className="h-3.5 w-3.5" />
              Поделиться папкой
            </button>
          )}
          {onDeleteFolder && (
            <button
              type="button"
              onClick={() => {
                onDeleteFolder(contextMenu.folderId);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5" />
              Удалить папку
            </button>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowCreateFolder(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Создать папку</h3>
              <button
                type="button"
                onClick={() => setShowCreateFolder(false)}
                className="rounded p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Название папки</label>
                <input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Введите название..."
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Типы чатов</label>
                <div className="mt-2 space-y-1.5">
                  {CHAT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const checked = selectedTypes.includes(type.key);
                    return (
                      <label
                        key={type.key}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-accent/30",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleType(type.key)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {type.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowCreateFolder(false)}
                className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!folderName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
