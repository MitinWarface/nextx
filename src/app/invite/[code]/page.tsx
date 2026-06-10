"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

interface InvitePreview {
  code: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  chat: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    type: "PRIVATE" | "GROUP" | "CHANNEL";
    memberCount: number;
  };
  alreadyMember: boolean;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  const [preview, setPreview] = React.useState<InvitePreview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);

  React.useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/invites/${code}`, { credentials: "include" })
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          const data = (await r.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(data?.error ?? `Ошибка ${r.status}`);
          return;
        }
        const data = (await r.json()) as { invite: InvitePreview };
        setPreview(data.invite);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "load_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleAccept = async () => {
    if (!code) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/invites/${code}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? `Ошибка ${res.status}`);
        return;
      }
      const data = (await res.json()) as { chatId: string };
      setAccepted(true);
      setTimeout(() => {
        router.push(`/?chat=${data.chatId}`);
      }, 700);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загружаем приглашение…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <X className="h-10 w-10 text-destructive" />
            <h2 className="text-base font-semibold">Приглашение недоступно</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="mt-2"
            >
              На главную
            </Button>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <Avatar
              name={preview.chat.name ?? "Chat"}
              src={preview.chat.avatarUrl}
              size="xl"
            />
            <div>
              <h2 className="text-lg font-semibold">
                {preview.chat.name ?? "Чат"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.chat.type === "CHANNEL"
                  ? "Канал"
                  : preview.chat.type === "GROUP"
                    ? "Группа"
                    : "Чат"}{" "}
                · {preview.chat.memberCount}{" "}
                {preview.chat.type === "CHANNEL" ? "подписчиков" : "участников"}
              </p>
            </div>
            {accepted ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Вступили! Открываем…
              </div>
            ) : preview.alreadyMember ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Вы уже участник этого чата.
                </p>
                <Button
                  onClick={() => router.push(`/?chat=${preview.chat.id}`)}
                >
                  Открыть чат
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вступаем…
                  </>
                ) : (
                  "Вступить"
                )}
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground">
              Код: {preview.code}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
