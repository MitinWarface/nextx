"use client";

import * as React from "react";
import { X, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_PRESETS } from "@/lib/status-presets";
import { toast } from "@/store/toast-store";

interface StatusPickerProps {
  open: boolean;
  onClose: () => void;
  currentStatus?: {
    statusEmoji?: string | null;
    statusText?: string | null;
    statusExpiresAt?: string | null;
    customStatus?: string | null;
  } | null;
  onSaved?: () => void;
}

const DURATION_OPTIONS = [
  { label: "1 \u0447\u0430\u0441", ms: 1 * 60 * 60 * 1000 },
  { label: "8 \u0447\u0430\u0441\u043E\u0432", ms: 8 * 60 * 60 * 1000 },
  { label: "24 \u0447\u0430\u0441\u0430", ms: 24 * 60 * 60 * 1000 },
  { label: "\u0411\u0435\u0441\u0441\u0440\u043E\u0447\u043D\u043E", ms: 0 },
];

export function StatusPicker({ open, onClose, currentStatus, onSaved }: StatusPickerProps) {
  const [customText, setCustomText] = React.useState(currentStatus?.customStatus ?? "");
  const [selectedDurationMs, setSelectedDurationMs] = React.useState<number>(0);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCustomText(currentStatus?.customStatus ?? "");
    }
  }, [open, currentStatus?.customStatus]);

  if (!open) return null;

  const handleSelectPreset = async (emoji: string, text: string) => {
    setSaving(true);
    try {
      const expiresAt = selectedDurationMs > 0
        ? new Date(Date.now() + selectedDurationMs).toISOString()
        : null;
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusEmoji: emoji,
          statusText: text,
          statusExpiresAt: expiresAt,
          customStatus: null,
        }),
      });
      if (res.ok) {
        toast.success("\u0421\u0442\u0430\u0442\u0443\u0441 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
        onSaved?.();
        onClose();
      } else {
        toast.error("\u041E\u0448\u0438\u0431\u043A\u0430");
      }
    } catch {
      toast.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
    if (!customText.trim()) return;
    setSaving(true);
    try {
      const expiresAt = selectedDurationMs > 0
        ? new Date(Date.now() + selectedDurationMs).toISOString()
        : null;
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusEmoji: null,
          statusText: null,
          statusExpiresAt: expiresAt,
          customStatus: customText.trim(),
        }),
      });
      if (res.ok) {
        toast.success("\u0421\u0442\u0430\u0442\u0443\u0441 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D");
        onSaved?.();
        onClose();
      } else {
        toast.error("\u041E\u0448\u0438\u0431\u043A\u0430");
      }
    } catch {
      toast.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438");
    } finally {
      setSaving(false);
    }
  };

  const handleClearStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusEmoji: null,
          statusText: null,
          statusExpiresAt: null,
          customStatus: null,
        }),
      });
      if (res.ok) {
        toast.success("\u0421\u0442\u0430\u0442\u0443\u0441 \u043E\u0447\u0438\u0449\u0435\u043D");
        onSaved?.();
        onClose();
      }
    } catch {
      toast.error("\u041E\u0448\u0438\u0431\u043A\u0430");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {/* Duration selector */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C</p>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedDurationMs(opt.ms)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    selectedDurationMs === opt.ms
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  <Clock className="mr-1 inline h-3 w-3" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preset grid */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">\u041F\u0440\u0435\u0434\u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438</p>
            <div className="grid grid-cols-3 gap-1.5">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset.emoji}
                  type="button"
                  onClick={() => handleSelectPreset(preset.emoji, preset.text)}
                  disabled={saving}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border border-border p-2 text-center transition-colors hover:bg-accent/60",
                    currentStatus?.statusEmoji === preset.emoji && currentStatus?.statusText === preset.text && "border-primary/40 bg-primary/5",
                  )}
                >
                  <span className="text-xl">{preset.emoji}</span>
                  <span className="text-[11px] font-medium">{preset.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom status */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">\u0421\u0432\u043E\u0439 \u0441\u0442\u0430\u0442\u0443\u0441</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="\u041D\u0430\u043F\u0440. \u0423\u0441\u0442\u0430\u043B \u043D\u0430 \u043A\u043E\u043D\u0444\u0435\u0440\u0435\u043D\u0446\u0438\u0438..."
                maxLength={100}
                className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleSaveCustom}
                disabled={saving || !customText.trim()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C
              </button>
            </div>
          </div>
        </div>

        {/* Clear button */}
        {(currentStatus?.statusEmoji || currentStatus?.statusText || currentStatus?.customStatus) && (
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={handleClearStatus}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
