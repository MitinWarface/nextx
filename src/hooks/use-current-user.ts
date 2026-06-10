"use client";

import * as React from "react";
import { useAuthStore, type CurrentUser } from "@/store/auth-store";
import type { PublicUser } from "@/types";

async function fetchSession(): Promise<{ user?: { id?: string } } | null> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/api/users/me", { credentials: "include" });
  if (!res.ok) return null;
  return (await res.json()) as PublicUser;
}

function toCurrentUser(p: PublicUser): CurrentUser {
  return {
    id: p.id,
    username: p.username,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    role: p.role ?? undefined,
  };
}

export function useCurrentUser(): {
  user: PublicUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const setStoreUser = useAuthStore((s) => s.setUser);
  const setStoreLoading = useAuthStore((s) => s.setLoading);
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchSession().then((s) => {
      if (cancelled) return;
      const hasUser = !!s?.user?.id;
      setAuthenticated(hasUser);
      if (!hasUser) {
        setUser(null);
        setStoreUser(null);
        setIsLoading(false);
        setStoreLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [setStoreUser, setStoreLoading]);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setStoreLoading(true);
    try {
      const u = await fetchMe();
      setUser(u);
      if (u) {
        setStoreUser(toCurrentUser(u));
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
  }, [setStoreUser, setStoreLoading]);

  React.useEffect(() => {
    if (authenticated === null) return;
    if (!authenticated) return;
    void refresh();
  }, [authenticated, refresh]);

  return { user, isLoading, refresh };
}
