"use client";

import * as React from "react";
import { Lock, Shield, X, ArrowRight } from "lucide-react";
import { toast } from "@/store/toast-store";

interface SecretChat {
  id: string;
  status: string;
  chatId: string | null;
  publicKey1: string | null;
  publicKey2: string | null;
  createdAt: string;
  partner?: { id: string; username: string; displayName: string };
  initiator?: { id: string; username: string; displayName: string };
}

interface SecretChatInitModalProps {
  open: boolean;
  onClose: () => void;
  contacts: Array<{ id: string; username: string; displayName: string }>;
  onCreated?: (chatId: string) => void;
}

export function SecretChatInitModal({ open, onClose, contacts, onCreated }: SecretChatInitModalProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!selectedId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/secret-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: selectedId }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Секретный чат создан");
        onCreated?.(data.data?.chatId ?? data.chatId);
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Начать секретный чат</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Секретные чаты используют сквозное шифрование. Сервер не имеет доступа к содержимому сообщений.
        </p>
        <div className="max-h-60 space-y-1 overflow-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                selectedId === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium">
                {c.displayName[0]}
              </div>
              <div className="text-left">
                <div className="font-medium">{c.displayName}</div>
                <div className="text-xs text-muted-foreground">@{c.username}</div>
              </div>
              {selectedId === c.id && <ArrowRight className="ml-auto h-4 w-4" />}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!selectedId || creating}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? "Создание..." : "Начать чат"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SecretChatListProps {
  secretChats: SecretChat[];
  onOpen?: (chatId: string) => void;
}

export function SecretChatList({ secretChats, onOpen }: SecretChatListProps) {
  if (secretChats.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
        <Shield className="h-3.5 w-3.5" />
        Секретные чаты
      </h3>
      {secretChats.map((sc) => {
        const partner = sc.initiator ?? sc.partner;
        return (
          <button
            key={sc.id}
            type="button"
            onClick={() => sc.chatId && onOpen?.(sc.chatId)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <Lock className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-left">
              <div className="font-medium">{partner?.displayName ?? "Неизвестный"}</div>
              <div className="text-xs text-muted-foreground">
                {sc.status === "ACTIVE" ? "Активен" : sc.status === "PENDING" ? "Ожидает принятия" : sc.status}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface SecretChatKeyExchangeProps {
  chatId: string;
  onComplete?: () => void;
}

export function SecretChatKeyExchange({ chatId, onComplete }: SecretChatKeyExchangeProps) {
  const [step, setStep] = React.useState<"init" | "sending" | "deriving" | "done" | "error">("init");

  const initKeys = async () => {
    try {
      setStep("sending");

      // 1. Generate key pair, store private key in IndexedDB
      const { initSecretChatKeys } = await import("@/lib/e2ee-store");
      const publicKeyJwk = await initSecretChatKeys(chatId);

      // 2. Send our public key to server
      const res = await fetch(`/api/secret-chats/${chatId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publicKey: JSON.stringify(publicKeyJwk) }),
      });
      if (!res.ok) throw new Error("Failed to send public key");

      // 3. Fetch peer's public key
      setStep("deriving");
      const infoRes = await fetch(`/api/secret-chats`, { credentials: "include" });
      if (infoRes.ok) {
        const data = await infoRes.json();
        const chats = data.data?.chats ?? data.chats ?? [];
        const myChat = chats.find((c: any) => c.id === chatId || c.chatId === chatId);
        const peerPubKey = myChat?.publicKey1 || myChat?.publicKey2;
        if (peerPubKey && peerPubKey !== JSON.stringify(publicKeyJwk)) {
          // 4. Derive shared key
          const { deriveAndCacheSharedKey } = await import("@/lib/e2ee-store");
          await deriveAndCacheSharedKey(chatId, JSON.parse(peerPubKey));
        }
      }

      setStep("done");
      setTimeout(() => onComplete?.(), 500);
    } catch (err) {
      console.error("Key exchange error:", err);
      setStep("error");
    }
  };

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
      <Lock className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
      <h3 className="mb-2 text-lg font-semibold">Обмен ключами шифрования</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Сгенерируйте ключи для сквозного шифрования этого чата.
      </p>
      {step === "done" ? (
        <p className="text-sm font-medium text-emerald-500">Готово! Чат зашифрован.</p>
      ) : step === "error" ? (
        <div>
          <p className="mb-2 text-sm text-destructive">Ошибка обмена ключами</p>
          <button type="button" onClick={initKeys} className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Повторить
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={initKeys}
          disabled={step !== "init"}
          className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {step === "sending" ? "Отправка ключей..." : step === "deriving" ? "Получение ключей собеседника..." : "Сгенерировать ключи"}
        </button>
      )}
    </div>
  );
}
