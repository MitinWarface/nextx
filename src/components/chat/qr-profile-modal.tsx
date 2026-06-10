"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Download, Loader2, Copy, Check } from "lucide-react";
import { toast } from "@/store/toast-store";

interface QrProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function QrProfileModal({ open, onClose }: QrProfileModalProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const [publicId, setPublicId] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setQrDataUrl(null);
    void fetch("/api/users/me/qr", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed");
        return (await r.json()) as { qrDataUrl: string; publicId: string | null; username: string };
      })
      .then((d) => {
        setQrDataUrl(d.qrDataUrl);
        setPublicId(d.publicId);
        setUsername(d.username);
      })
      .catch(() => {
        toast.error("Не удалось загрузить QR-код");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleDownload = React.useCallback(async () => {
    if (!qrDataUrl || !username) return;
    setDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `nextx-qr-${username}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setDownloading(false);
    }
  }, [qrDataUrl, username]);

  const handleCopy = React.useCallback(() => {
    const content = publicId
      ? `nextx://user/${publicId}`
      : `http://localhost:3000/u/${username}`;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      toast.success("Скопировано в буфер обмена");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Ошибка копирования");
    });
  }, [publicId, username]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold">QR-код профиля</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex flex-1 flex-col items-center gap-4 p-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : qrDataUrl ? (
            <>
              <img
                src={qrDataUrl}
                alt="QR-код профиля"
                className="h-[240px] w-[240px] rounded-lg border border-border"
              />
              <div className="text-center">
                <p className="text-sm font-semibold">@{username}</p>
                {publicId && (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{publicId}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-2 rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Загрузка..." : "Скачать PNG"}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Скопировано" : "Копировать ссылку"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">QR-код недоступен</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
