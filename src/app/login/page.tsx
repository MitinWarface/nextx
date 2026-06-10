"use client";

import * as React from "react";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
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
      const res = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError("Неверный логин или пароль");
        return;
      }
      if (res?.ok) {
        router.push(res.url ?? callbackUrl);
        router.refresh();
      }
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

        <div className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          <div className="font-medium">Dev-аккаунты:</div>
          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
            <span>me</span>
            <span>password123</span>
            <span>david_moore</span>
            <span>password123</span>
            <span>jessica_drew</span>
            <span>password123</span>
            <span>greg_james</span>
            <span>password123</span>
          </div>
        </div>

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
