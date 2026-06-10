"use client";

import * as React from "react";

interface EditHistoryEntry {
  id: string;
  oldContent: string;
  newContent: string;
  editedBy: { id: string; username: string; displayName: string };
  createdAt: string;
}

interface EditHistoryModalProps {
  edits: EditHistoryEntry[];
  loading: boolean;
  onClose: () => void;
}

export function EditHistoryModal({ edits, loading, onClose }: EditHistoryModalProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleExpand = React.useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">История изменений</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Загрузка...
            </div>
          ) : edits.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Нет изменений
            </div>
          ) : (
            <div className="space-y-3">
              {edits.map((edit) => {
                const isExpanded = expandedId === edit.id;
                return (
                  <div
                    key={edit.id}
                    className="rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleExpand(edit.id)}
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-medium">{edit.editedBy.displayName}</span>
                      <span>{new Date(edit.createdAt).toLocaleString("ru-RU")}</span>
                    </div>
                    {isExpanded ? (
                      <div className="mt-2 space-y-1 text-[13px]">
                        <div className="rounded bg-destructive/10 px-2 py-1 text-destructive line-through">
                          {edit.oldContent}
                        </div>
                        <div className="rounded bg-primary/10 px-2 py-1 text-primary">
                          {edit.newContent}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 truncate text-[13px] text-foreground/80">
                        {edit.newContent}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
