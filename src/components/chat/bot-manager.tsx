"use client";

import * as React from "react";
import { Copy, ExternalLink, Trash2, Plus, Webhook, MessageSquare } from "lucide-react";
import { toast } from "@/store/toast-store";

interface Bot {
  id: string;
  username: string;
  displayName: string;
  botToken: string;
  webhookUrl: string | null;
  createdAt: string;
  _count: { messages: number };
}

interface BotCreatorModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function BotCreatorModal({ open, onClose, onCreated }: BotCreatorModalProps) {
  const [username, setUsername] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!username || !displayName) {
      toast.error("Заполните все поля");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, displayName }),
      });
      if (res.ok) {
        toast.success("Бот создан");
        onCreated?.();
        onClose();
        setUsername("");
        setDisplayName("");
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
        <h2 className="mb-4 text-lg font-semibold">Создать бота</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="my_bot"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Отображаемое имя</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Мой бот"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
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
            disabled={creating}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? "Создание..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BotTokenModalProps {
  open: boolean;
  token: string | null;
  onClose: () => void;
}

export function BotTokenModal({ open, token, onClose }: BotTokenModalProps) {
  if (!open || !token) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">Токен бота</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Сохраните этот токен. Он показывается только один раз.
        </p>
        <div className="flex items-center gap-2 rounded-md bg-muted p-3">
          <code className="flex-1 text-xs break-all">{token}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(token);
              toast.success("Токен скопирован");
            }}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title="Копировать"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

export function BotList() {
  const [bots, setBots] = React.useState<Bot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showToken, setShowToken] = React.useState(false);
  const [newToken, setNewToken] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = React.useState("");

  const loadBots = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bots", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBots(data.data?.bots ?? data.bots ?? []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadBots(); }, [loadBots]);

  const handleSetWebhook = async (botId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ webhookUrl }),
      });
      if (res.ok) {
        toast.success("Webhook установлен");
        setEditingId(null);
        setWebhookUrl("");
        loadBots();
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  const handleDeleteWebhook = async (botId: string) => {
    try {
      const res = await fetch(`/api/bots/${botId}/webhook`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Webhook удалён");
        loadBots();
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Боты</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Создать бота
        </button>
      </div>

      <BotCreatorModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadBots} />
      <BotTokenModal open={showToken} token={newToken} onClose={() => { setShowToken(false); setNewToken(null); }} />

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Загрузка...</div>
      ) : bots.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">Ботов пока нет</div>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => (
            <div key={bot.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{bot.displayName}</span>
                    <span className="text-muted-foreground">@{bot.username}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Создан: {new Date(bot.createdAt).toLocaleDateString("ru")} • Сообщений: {bot._count.messages}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Webhook className="h-3.5 w-3.5" />
                  {bot.webhookUrl ?? "Без webhook"}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                {editingId === bot.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://example.com/webhook"
                      className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleSetWebhook(bot.id)}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setWebhookUrl(""); }}
                      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setEditingId(bot.id); setWebhookUrl(bot.webhookUrl ?? ""); }}
                      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
                    >
                      {bot.webhookUrl ? "Изменить webhook" : "Установить webhook"}
                    </button>
                    {bot.webhookUrl && (
                      <button
                        type="button"
                        onClick={() => handleDeleteWebhook(bot.id)}
                        className="rounded-md border border-border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                      >
                        Удалить webhook
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
