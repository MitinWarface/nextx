"use client";

import * as React from "react";
import {
  MessageSquare,
  Trash2,
  Search,
  Archive,
  Snowflake,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface AdminChat {
  id: string;
  name: string | null;
  type: string;
  isArchived: boolean;
  lastMessageAt: string;
  createdAt: string;
  _count: { messages: number; participants: number };
}

const PAGE_SIZE = 20;

const typeColors: Record<string, string> = {
  PRIVATE: "bg-blue-500/10 text-blue-500",
  GROUP: "bg-violet-500/10 text-violet-500",
  CHANNEL: "bg-amber-500/10 text-amber-500",
  SERVICE: "bg-zinc-400/10 text-zinc-400",
  SELF: "bg-emerald-500/10 text-emerald-500",
};

export default function AdminChatsPage() {
  const [chats, setChats] = React.useState<AdminChat[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const loadChats = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/chats?${params}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setChats(json.data?.chats ?? json.chats ?? []);
        setTotal(json.data?.total ?? json.total ?? 0);
      }
    } catch {
      toast.error("Ошибка загрузки чатов");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleArchive = async (chat: AdminChat) => {
    if (actingId) return;
    setActingId(chat.id);
    try {
      const res = await fetch(`/api/admin/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isArchived: !chat.isArchived }),
      });
      if (res.ok) {
        toast.success(chat.isArchived ? "Чат восстановлен" : "Чат заархивирован");
        loadChats();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setActingId(null);
    }
  };

  const handleFreeze = async (chat: AdminChat) => {
    if (actingId) return;
    setActingId(chat.id);
    try {
      const res = await fetch(`/api/admin/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isArchived: true }),
      });
      if (res.ok) {
        toast.success("Чат заморожен");
        loadChats();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (chatId: string) => {
    if (actingId) return;
    if (!confirm("Удалить чат и все сообщения?")) return;
    setActingId(chatId);
    try {
      const res = await fetch(`/api/admin/chats/${chatId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Чат удалён");
        loadChats();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Чаты</h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по названию..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">Всего: {total}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="p-3">Название</th>
              <th className="p-3">Тип</th>
              <th className="p-3">Участников</th>
              <th className="p-3">Последнее сообщение</th>
              <th className="p-3">Создан</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Загрузка...
                </td>
              </tr>
            ) : chats.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Нет чатов
                </td>
              </tr>
            ) : (
              chats.map((chat) => (
                <tr
                  key={chat.id}
                  className="border-b border-border/50 hover:bg-accent/30"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {chat.name ?? "Без названия"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs ${typeColors[chat.type] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {chat.type}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {chat._count.participants}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(chat.lastMessageAt).toLocaleDateString("ru")}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(chat.createdAt).toLocaleDateString("ru")}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleArchive(chat)}
                        disabled={actingId === chat.id}
                        className={`rounded p-1 hover:bg-muted ${chat.isArchived ? "text-amber-500" : "text-muted-foreground"}`}
                        title={chat.isArchived ? "Восстановить" : "Архивировать"}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFreeze(chat)}
                        disabled={actingId === chat.id}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-blue-500"
                        title="Заморозить"
                      >
                        <Snowflake className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(chat.id)}
                        disabled={actingId === chat.id}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="py-1 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1 text-sm disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
