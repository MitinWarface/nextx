"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ForwardAnonymousDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (isStealth: boolean) => void;
  messagePreview?: string;
}

export function ForwardAnonymousDialog({
  open,
  onClose,
  onConfirm,
  messagePreview,
}: ForwardAnonymousDialogProps) {
  const [isStealth, setIsStealth] = React.useState(false);

  React.useEffect(() => {
    if (!open) setIsStealth(false);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const portalNode = typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Переслать сообщение</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-4">
          {messagePreview && (
            <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
              {messagePreview}
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
            <input
              type="checkbox"
              checked={isStealth}
              onChange={(e) => setIsStealth(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Скрыть автора</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Получатели не увидят, от кого переслано сообщение
              </p>
            </div>
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onConfirm(isStealth)}>
            Переслать
          </Button>
        </footer>
      </div>
    </div>,
    portalNode,
  );
}
