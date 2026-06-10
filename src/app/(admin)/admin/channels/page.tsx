"use client";

import * as React from "react";
import {
  Radio,
  Search,
  Ban,
  Unlock,
  Lock,
  UnlockIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface AdminChannel {
  id: string;
  name: string | null;
  description: string | null;
  isPrivate: boolean;
  createdAt: string;
  creatorId: string | null;
  _count: { messages: number; participants: number };
  complaints?: number;
}

const PAGE_SIZE = 20;

export default function AdminChannelsPage() {
  const [channels, setChannels] = React.useState<AdminChannel[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const loadChannels = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/chats?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const all = json.data?.chats ?? json.chats ?? [];
        const filtered = all.filter(
          (c: { type: string }) => c.type === "CHANNEL",
        );
        // Fetch complaints count for each channel
        const channelsWithComplaints = await Promise.all(
          filtered.map(async (ch: AdminChannel) => {
            try {
              const r = await fetch(`/api/admin/chats/${ch.id}/complaints`, { credentials: "include" });
              if (r.ok) {
                const d = await r.json();
                return { ...ch, complaints: d.total ?? 0 };
              }
            } catch {}
            return { ...ch, complaints: 0 };
          }),
        );
        setChannels(channelsWithComplaints);
        setTotal(json.data?.total ?? json.total ?? 0);
      }
    } catch {
      toast.error("Ошибка загрузки каналов");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  React.useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleBlockCreator = async (channel: AdminChannel) => {
    if (!channel.creatorId || actingId) return;
    if (!confirm(`Заблокировать создателя канала "${channel.name ?? "Без названия"}"?`)) return;
    setActingId(channel.id);
    try {
      const res = await fetch(`/api/admin/users/${channel.creatorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "BLOCKED" }),
      });
      if (res.ok) {
        toast.success("Создатель заблокирован");
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

  const handleUnblockCreator = async (channel: AdminChannel) => {
    if (!channel.creatorId || actingId) return;
    setActingId(channel.id);
    try {
      const res = await fetch(`/api/admin/users/${channel.creatorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (res.ok) {
        toast.success("Создатель разблокирован");
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

  const handleTogglePrivate = async (channel: AdminChannel) => {
    if (actingId) return;
    setActingId(channel.id);
    try {
      const res = await fetch(`/api/admin/chats/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPrivate: !channel.isPrivate }),
      });
      if (res.ok) {
        toast.success(channel.isPrivate ? "Канал стал публичным" : "Канал стал приватным");
        loadChannels();
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
      <h1 className="text-2xl font-bold">Каналы</h1>

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
              <th className="p-3">Подписчиков</th>
              <th className="p-3">Жалоб</th>
              <th className="p-3">Описание</th>
              <th className="p-3">Приватный</th>
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
            ) : channels.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Нет каналов
                </td>
              </tr>
            ) : (
              channels.map((ch) => (
                <tr
                  key={ch.id}
                  className="border-b border-border/50 hover:bg-accent/30"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {ch.name ?? "Без названия"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {ch._count.participants}
                  </td>
                  <td className="p-3">
                    {(ch.complaints ?? 0) > 0 ? (
                      <span className="inline-block rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-500">
                        {ch.complaints}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                    {ch.description ?? "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                        ch.isPrivate
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {ch.isPrivate ? "PRIVATE" : "PUBLIC"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(ch.createdAt).toLocaleDateString("ru")}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {ch.creatorId && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBlockCreator(ch)}
                            disabled={actingId === ch.id}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Заблокировать создателя"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnblockCreator(ch)}
                            disabled={actingId === ch.id}
                            className="rounded p-1 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                            title="Разблокировать создателя"
                          >
                            <UnlockIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTogglePrivate(ch)}
                        disabled={actingId === ch.id}
                        className={`rounded p-1 hover:bg-muted ${ch.isPrivate ? "text-amber-500" : "text-muted-foreground"}`}
                        title={ch.isPrivate ? "Сделать публичным" : "Сделать приватным"}
                      >
                        {ch.isPrivate ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
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
