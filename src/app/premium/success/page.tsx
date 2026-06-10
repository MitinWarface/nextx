"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowLeft } from "lucide-react";

export default function PremiumSuccessPage() {
  const router = useRouter();

  React.useEffect(() => {
    const timer = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="mx-4 max-w-sm text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
        <h1 className="mb-2 text-2xl font-bold">Оплата прошла успешно!</h1>
        <p className="mb-6 text-muted-foreground">
          Ваш Premium активирован. Функции доступны сразу.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться в мессенджер
        </button>
        <p className="mt-4 text-xs text-muted-foreground/60">
          Автоматический переход через 5 секунд...
        </p>
      </div>
    </div>
  );
}
