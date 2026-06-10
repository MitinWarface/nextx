"use client";

import * as React from "react";

const STORAGE_KEY = "nextx:push:enabled";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export interface UsePushOptions {
  /** Активный chatId — если он совпадает с пришедшим, нотификация не показывается. */
  activeChatId?: string | null;
  /** Показывать ли тост при успешной подписке/отписке. */
  showToasts?: boolean;
}

export interface UsePushResult {
  supported: boolean;
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  pending: boolean;
  error: string | null;
  setEnabled: (next: boolean) => Promise<void>;
}

/**
 * Хук: подписка на Web Push (VAPID). Регистрирует /sw.js, сохраняет
 * подписку на сервере. Работает только при наличии VAPID-ключа на сервере.
 */
export function usePush({ activeChatId = null, showToasts = false }: UsePushOptions = {}): UsePushResult {
  const [supported, setSupported] = React.useState(false);
  const [enabled, setEnabledState] = React.useState(false);
  const [permission, setPermission] =
    React.useState<NotificationPermission | "unsupported">("default");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const regRef = React.useRef<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      setPermission("unsupported");
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);

    // Регистрация service worker
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        regRef.current = reg;
        const stored = localStorage.getItem(STORAGE_KEY) === "1";
        if (stored) {
          reg.pushManager
            .getSubscription()
            .then((sub) => {
              if (sub) {
                setEnabledState(true);
              } else {
                // сохранённое «включено», но подписки нет — пытаемся переподписаться
                void trySubscribe();
              }
            })
            .catch(() => undefined);
        }
      })
      .catch((err) => {
        console.warn("SW register failed:", err);
      });
  }, []);

  const trySubscribe = React.useCallback(async () => {
    const reg = regRef.current;
    if (!reg) return;
    const res = await fetch("/api/push/vapid-key", { credentials: "include" });
    if (!res.ok) throw new Error("vapid_unavailable");
    const data = (await res.json()) as { configured: boolean; vapidKey: string | null };
    if (!data.configured || !data.vapidKey) {
      throw new Error("vapid_not_configured");
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        data.vapidKey,
      ) as unknown as BufferSource,
    });
    const subJson = sub.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
    const post = await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subJson),
    });
    if (!post.ok) throw new Error("subscribe_failed");
    setEnabledState(true);
    localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  const setEnabled = React.useCallback(
    async (next: boolean) => {
      if (!supported) return;
      setError(null);
      setPending(true);
      try {
        if (next) {
          if (Notification.permission === "denied") {
            throw new Error("permission_denied");
          }
          if (Notification.permission === "default") {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result !== "granted") {
              throw new Error("permission_denied");
            }
          }
          await trySubscribe();
        } else {
          const reg = regRef.current;
          if (reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              const endpoint = sub.endpoint;
              await sub.unsubscribe();
              await fetch("/api/push/subscribe", {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint }),
              }).catch(() => undefined);
            }
          }
          setEnabledState(false);
          localStorage.setItem(STORAGE_KEY, "0");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "push_failed";
        setError(message);
        if (showToasts) {
          const { toast } = await import("@/store/toast-store");
          toast.error("Не удалось обновить push-подписку");
        }
      } finally {
        setPending(false);
      }
    },
    [supported, showToasts, trySubscribe],
  );

  return { supported, enabled, permission, pending, error, setEnabled };
}
