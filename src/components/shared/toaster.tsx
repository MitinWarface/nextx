"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, X, AlertCircle, Info } from "lucide-react";
import { useToastStore, useAutoDismiss, type Toast, type ToastVariant } from "@/store/toast-store";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <Check className="h-4 w-4 text-primary" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
  info: <Info className="h-4 w-4 text-primary" />,
};

const STYLES: Record<ToastVariant, string> = {
  default: "border-border bg-card text-foreground",
  success: "border-primary/30 bg-card text-foreground",
  error: "border-destructive/40 bg-card text-foreground",
  info: "border-primary/30 bg-card text-foreground",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const portalNode = typeof document !== "undefined" ? document.body : null;
  if (!portalNode) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    portalNode,
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  useAutoDismiss(toast);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2 rounded-lg border px-3 py-2 shadow-lg",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        STYLES[toast.variant],
      )}
    >
      {ICONS[toast.variant]}
      <p className="flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Закрыть"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
