"use client";

import * as React from "react";
import { Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Send, UserPlus } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [username, setUsername] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "username_taken") {
          setError("Это имя пользователя уже занято");
        } else {
          setError(data?.error ?? "Ошибка регистрации");
        }
        setIsSubmitting(false);
        return;
      }

      const csrfRes2 = await fetch("/api/auth/csrf", { credentials: "include" });
      const { csrfToken: csrfToken2 } = await csrfRes2.json();
      const fd = new FormData();
      fd.append("csrfToken", csrfToken2);
      fd.append("username", username.trim());
      fd.append("password", password);
      fd.append("redirect", "false");
      fd.append("json", "true");
      const loginRes = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      setIsSubmitting(false);
      if (loginRes.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError("Аккаунт создан, но вход не удался. Попробуйте войти.");
      }
    } catch {
      setError("Ошибка сети");
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
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">NextX</h1>
            <p className="text-xs text-muted-foreground">Создайте аккаунт</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Username *
            </label>
            <Input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="ivan_petrov"
              required
              minLength={3}
              maxLength={32}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Отображаемое имя
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Иван Петров"
              maxLength={64}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Пароль *
            </label>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Повторите пароль *
            </label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ещё раз"
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
            disabled={isSubmitting || !username || !password || !confirm}
          >
            {isSubmitting ? "Создаём…" : "Зарегистрироваться"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Загрузка...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
