"use client";

import * as React from "react";
import { Calendar, Plus, Trash2, Edit, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface SeasonalEvent {
  id: string;
  code: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  theme: { colors?: string[]; icon?: string; background?: string } | null;
  createdAt: string;
}

export default function AdminSeasonalPage() {
  const [events, setEvents] = React.useState<SeasonalEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<SeasonalEvent | null>(null);
  const [search, setSearch] = React.useState("");

  const [form, setForm] = React.useState({
    code: "",
    name: "",
    description: "",
    startsAt: "",
    endsAt: "",
    themeColors: "",
    themeIcon: "",
    themeBackground: "",
  });

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seasonal", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } catch {
      toast.error("Ошибка загрузки событий");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return events;
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [events, search]);

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      description: "",
      startsAt: "",
      endsAt: "",
      themeColors: "",
      themeIcon: "",
      themeBackground: "",
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleEdit = (event: SeasonalEvent) => {
    setForm({
      code: event.code,
      name: event.name,
      description: event.description,
      startsAt: event.startsAt.slice(0, 16),
      endsAt: event.endsAt.slice(0, 16),
      themeColors: event.theme?.colors?.join(", ") ?? "",
      themeIcon: event.theme?.icon ?? "",
      themeBackground: event.theme?.background ?? "",
    });
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.startsAt || !form.endsAt) {
      toast.error("Заполните обязательные поля");
      return;
    }

    const theme: Record<string, unknown> = {};
    if (form.themeColors) theme.colors = form.themeColors.split(",").map((c) => c.trim());
    if (form.themeIcon) theme.icon = form.themeIcon;
    if (form.themeBackground) theme.background = form.themeBackground;

    try {
      const url = editingEvent
        ? `/api/admin/seasonal/${editingEvent.id}`
        : "/api/admin/seasonal";
      const method = editingEvent ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          theme: Object.keys(theme).length > 0 ? theme : null,
        }),
      });

      if (res.ok) {
        toast.success(editingEvent ? "Событие обновлено" : "Событие создано");
        resetForm();
        loadEvents();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleDelete = async (event: SeasonalEvent) => {
    if (!confirm(`Удалить событие "${event.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/seasonal/${event.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Событие удалено");
        loadEvents();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const now = new Date();
  const isActive = (event: SeasonalEvent) => {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    return start <= now && end >= now;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seasonal Events</h1>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Создать
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">Всего: {filtered.length}</span>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              {editingEvent ? "Редактировать событие" : "Новое событие"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Код *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. halloween_2026"
                disabled={!!editingEvent}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Название *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Хэллоуин 2026"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Описание</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Описание seasonal event..."
                rows={2}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Начало *</label>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Конец *</label>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Цвета темы (через запятую)</label>
              <Input
                value={form.themeColors}
                onChange={(e) => setForm({ ...form, themeColors: e.target.value })}
                placeholder="#ff6600, #330066"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Иконка</label>
              <Input
                value={form.themeIcon}
                onChange={(e) => setForm({ ...form, themeIcon: e.target.value })}
                placeholder="🎃"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Фон</label>
              <Input
                value={form.themeBackground}
                onChange={(e) => setForm({ ...form, themeBackground: e.target.value })}
                placeholder="https://example.com/bg.jpg"
                className="mt-1"
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {editingEvent ? "Сохранить" : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="p-3">Статус</th>
              <th className="p-3">Код</th>
              <th className="p-3">Название</th>
              <th className="p-3">Период</th>
              <th className="p-3">Тема</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Нет событий
                </td>
              </tr>
            ) : (
              filtered.map((event) => {
                const active = isActive(event);
                return (
                  <tr
                    key={event.id}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    <td className="p-3">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                          active
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{event.code}</td>
                    <td className="p-3 font-medium">{event.name}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(event.startsAt).toLocaleDateString("ru")} —{" "}
                      {new Date(event.endsAt).toLocaleDateString("ru")}
                    </td>
                    <td className="p-3">
                      {event.theme?.icon && (
                        <span className="text-lg">{event.theme.icon}</span>
                      )}
                      {event.theme?.colors && (
                        <div className="flex gap-0.5 mt-0.5">
                          {event.theme.colors.slice(0, 3).map((color, i) => (
                            <div
                              key={i}
                              className="h-3 w-3 rounded-full border"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(event)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Редактировать"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
