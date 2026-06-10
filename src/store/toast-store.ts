import { create } from "zustand";
import { useEffect } from "react";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, opts?: { variant?: ToastVariant; duration?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, opts) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const toast: Toast = {
      id,
      message,
      variant: opts?.variant ?? "default",
      duration: opts?.duration ?? 3500,
    };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

// Удобные хелперы
export const toast = {
  show: (message: string, opts?: { variant?: ToastVariant; duration?: number }) =>
    useToastStore.getState().show(message, opts),
  success: (message: string) =>
    useToastStore.getState().show(message, { variant: "success" }),
  error: (message: string) =>
    useToastStore.getState().show(message, { variant: "error", duration: 5000 }),
  info: (message: string) =>
    useToastStore.getState().show(message, { variant: "info" }),
};

/**
 * Хук: автоматически убирает тост через duration мс.
 */
export function useAutoDismiss(toast: Toast) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    if (toast.duration <= 0) return;
    const t = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, dismiss]);
}
