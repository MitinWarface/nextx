"use client";

import * as React from "react";
import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Send, QrCode } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
      const { csrfToken } = await csrfRes.json();
      const fd = new FormData();
      fd.append("csrfToken", csrfToken);
      fd.append("username", username.trim());
      fd.append("password", password);
      fd.append("redirect", "false");
      fd.append("json", "true");
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        setError("Неверный логин или пароль");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">NextX</h1>
            <p className="text-xs text-muted-foreground">Войдите в аккаунт</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Username
            </label>
            <Input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="me"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Пароль
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              required
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !username || !password}
          >
            {isSubmitting ? "Входим…" : "Войти"}
          </Button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Или
            </span>
          </div>
        </div>

        <Link href="/qr-login">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="sm"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Войти по QR-коду
          </Button>
        </Link>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Загрузка...</div>}>
      <LoginForm />
    </Suspense>
  );
}
