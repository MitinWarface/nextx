"use client";

import * as React from "react";
import { X, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "SPAM", label: "Спам" },
  { value: "FRAUD", label: "Мошенничество" },
  { value: "ABUSE", label: "Оскорбления" },
  { value: "PORN", label: "Порнография" },
  { value: "VIOLENCE", label: "Насилие" },
  { value: "FAKE", label: "Фейк" },
  { value: "OTHER", label: "Другое" },
] as const;

interface ReportDialogProps {
  messageId: string;
  targetUserId: string;
  onClose: () => void;
}

export function ReportDialog({ messageId, targetUserId, onClose }: ReportDialogProps) {
  const [reason, setReason] = React.useState<string>("SPAM");
  const [description, setDescription] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetUserId,
          targetMessageId: messageId,
          reason,
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Ошибка отправки");
      }
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message ?? "Ошибка");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[360px] rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">Пожаловаться</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="py-6 text-center text-sm text-green-600">
            Жалоба отправлена. Спасибо!
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted-foreground">Причина</label>
              <div className="grid grid-cols-2 gap-1">
                {REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-xs transition-colors",
                      reason === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs text-muted-foreground">Описание (необязательно)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Подробности..."
                maxLength={1000}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              className="w-full rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:brightness-110 disabled:opacity-50"
            >
              {sending ? "Отправка..." : "Отправить жалобу"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
