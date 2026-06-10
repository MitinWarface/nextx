/**
 * Хук: текущий пользователь из NextAuth session.
 * Возвращает user из JWT (id), затем подтягивает PublicUser с сервера.
 * Также синхронизирует useAuthStore (используется в других хуках).
 */
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useAuthStore, type CurrentUser } from "@/store/auth-store";
import type { PublicUser } from "@/types";

async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/api/users/me", { credentials: "include" });
  if (!res.ok) return null;
  return (await res.json()) as PublicUser;
}

function toCurrentUser(p: PublicUser, session?: ReturnType<typeof useSession>["data"]): CurrentUser {
  return {
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    role: p.role ?? (session?.user as any)?.role ?? undefined,
    features: (session?.user as any)?.features ?? undefined,
  };
}

export function useCurrentUser(): {
  user: PublicUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const { data: session, status } = useSession();
  const setStoreUser = useAuthStore((s) => s.setUser);
  const setStoreLoading = useAuthStore((s) => s.setLoading);
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setStoreLoading(true);
    try {
      const u = await fetchMe();
      setUser(u);
      if (u) {
        setStoreUser(toCurrentUser(u, session));
        // Register device on login
        try {
          await fetch("/api/auth/device", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAgent: navigator.userAgent }),
          });
        } catch { /* non-critical */ }
      }
    } finally {
      setIsLoading(false);
      setStoreLoading(false);
    }
  }, [setStoreUser, setStoreLoading, session]);

  React.useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
      setStoreLoading(true);
      return;
    }
    if (status === "unauthenticated" || !sessionUserId) {
      setUser(null);
      setStoreUser(null);
      setIsLoading(false);
      setStoreLoading(false);
      return;
    }
    void refresh();
  }, [sessionUserId, status, refresh, setStoreUser, setStoreLoading]);

  return { user, isLoading, refresh };
}
