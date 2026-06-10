"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  ExternalLink,
  X,
  MoreVertical,
} from "lucide-react";

interface MiniAppModalProps {
  open: boolean;
  onClose: () => void;
  appUrl: string;
  title: string;
}

export function MiniAppModal({
  open,
  onClose,
  appUrl,
  title,
}: MiniAppModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [iframeKey, setIframeKey] = React.useState(0);
  const settingsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  if (!mounted || !open) return null;

  const handleReload = () => {
    setIframeKey((k) => k + 1);
    setSettingsOpen(false);
  };

  const handleOpenInNewTab = () => {
    window.open(appUrl, "_blank", "noopener,noreferrer");
    setSettingsOpen(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        </div>
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {settingsOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <MoreVertical className="h-5 w-5" />
            )}
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-52 rounded-lg border border-border bg-card shadow-xl">
              <button
                type="button"
                onClick={handleReload}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Перезагрузить
              </button>
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                Открыть в новой вкладке
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative">
        <iframe
          key={iframeKey}
          src={appUrl}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
          allow="camera; microphone; geolocation"
          title={title}
        />
      </div>
    </div>,
    document.body,
  );
}
