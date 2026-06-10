"use client";

import * as React from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Users,
  Trash2,
  Edit3,
  Check,
  Filter,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  isAllDay?: boolean;
  chatId?: string | null;
  chat?: { id: string; name: string; type: string } | null;
  rsvps?: Array<{
    id: string;
    status: string;
    user: { id: string; displayName: string; avatarUrl?: string | null };
  }>;
}

interface Reminder {
  id: string;
  remindAt: string;
  text?: string | null;
  chat?: { id: string; name: string; type: string } | null;
  message?: { id: string; content: string; type: string } | null;
}

interface ScheduledMessage {
  id: string;
  chatId: string;
  content: string;
  type: string;
  scheduledFor: string;
}

interface UnifiedItem {
  id: string;
  type: "event" | "reminder" | "scheduled";
  title: string;
  date: string;
  description?: string | null;
  chatName?: string | null;
}

interface CalendarModalProps {
  open: boolean;
  onClose: () => void;
}

type FilterType = "all" | "mine" | "group";

const DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function CalendarModal({ open, onClose }: CalendarModalProps) {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [scheduled, setScheduled] = React.useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [filter, setFilter] = React.useState<FilterType>("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = React.useState<"events" | "unified">("events");

  const fetchEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, remindersRes, scheduledRes] = await Promise.all([
        fetch("/api/events", { credentials: "include" }),
        fetch("/api/users/me/reminders", { credentials: "include" }),
        fetch("/api/scheduled", { credentials: "include" }),
      ]);
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events ?? []);
      }
      if (remindersRes.ok) {
        const data = await remindersRes.json();
        setReminders(data.reminders ?? []);
      }
      if (scheduledRes.ok) {
        const data = await scheduledRes.json();
        setScheduled(data.messages ?? []);
      }
    } catch {
      toast.error("Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) fetchEvents();
  }, [open, fetchEvents]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
      if (filter === "mine") return !e.chatId;
      if (filter === "group") return !!e.chatId;
      return true;
    });
  }, [events, filter]);

  const unifiedItems = React.useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    for (const ev of filteredEvents) {
      items.push({
        id: `event-${ev.id}`,
        type: "event",
        title: ev.title,
        date: ev.startsAt,
        description: ev.description,
        chatName: ev.chat?.name ?? null,
      });
    }
    for (const r of reminders) {
      items.push({
        id: `reminder-${r.id}`,
        type: "reminder",
        title: r.text || "Напоминание",
        date: r.remindAt,
        description: r.message?.content ?? null,
        chatName: r.chat?.name ?? null,
      });
    }
    for (const s of scheduled) {
      items.push({
        id: `scheduled-${s.id}`,
        type: "scheduled",
        title: s.content.slice(0, 60) || "Запланированное",
        date: s.scheduledFor,
        description: s.content,
        chatName: null,
      });
    }
    return items;
  }, [filteredEvents, reminders, scheduled]);

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, UnifiedItem[]>();
    const source = viewMode === "unified" ? unifiedItems : filteredEvents.map((ev) => ({
      id: `event-${ev.id}`,
      type: "event" as const,
      title: ev.title,
      date: ev.startsAt,
      description: ev.description,
      chatName: ev.chat?.name ?? null,
    }));
    for (const item of source) {
      const day = new Date(item.date).toISOString().slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return map;
  }, [viewMode, unifiedItems, filteredEvents]);

  const selectedDayItems = React.useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toISOString().slice(0, 10);
    return eventsByDate.get(key) ?? [];
  }, [selectedDate, eventsByDate]);

  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const isSelected = (d: Date) =>
    selectedDate &&
    d.getDate() === selectedDate.getDate() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getFullYear() === selectedDate.getFullYear();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleRsvp = async (eventId: string, status: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("Ответ отправлен");
        fetchEvents();
      } else {
        toast.error("Ошибка RSVP");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Удалить событие?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Событие удалено");
        fetchEvents();
      }
    } catch {
      toast.error("Ошибка удаления");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[85vh] w-full max-w-5xl rounded-2xl bg-background shadow-2xl overflow-hidden">
        {/* Left: Calendar Grid */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Календарь</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("events")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  viewMode === "events" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                События
              </button>
              <button
                type="button"
                onClick={() => setViewMode("unified")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                  viewMode === "unified" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                Все
              </button>
            </div>
            <div className="flex items-center gap-1">
              {viewMode === "unified" && (
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> События
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Напоминания
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Отложенные
                  </span>
                </div>
              )}
              <button type="button" onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-accent">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[140px] text-center text-sm font-medium">
                {MONTHS_RU[month]} {year}
              </span>
              <button type="button" onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-accent">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              {(["all", "mine", "group"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                    filter === f ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  {f === "all" ? "Все" : f === "mine" ? "Мои" : "Групповые"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border">
            {DAYS_RU.map((d) => (
              <div key={d} className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 gap-px bg-border">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="bg-background" />;
              const key = day.toISOString().slice(0, 10);
              const dayEvents = eventsByDate.get(key) ?? [];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex flex-col items-center py-2 bg-background transition-colors hover:bg-accent/50",
                    isSelected(day) && "bg-primary/10 ring-1 ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      isToday(day) && "bg-primary font-bold text-primary-foreground",
                      isSelected(day) && !isToday(day) && "font-semibold text-primary",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="mt-0.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            ev.type === "event" ? "bg-blue-500" : ev.type === "reminder" ? "bg-yellow-500" : "bg-green-500",
                          )}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Events + Create */}
        <div className="w-80 flex flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              {selectedDate ? (
                <h3 className="font-semibold">
                  {selectedDate.getDate()} {MONTHS_RU[selectedDate.getMonth()]}
                </h3>
              ) : (
                <h3 className="text-muted-foreground">Выберите день</h3>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setEditingEvent(null); setShowCreate(true); }}
              className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedDayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Нет событий</p>
              </div>
            ) : (
              selectedDayItems.map((item) => {
                const typeIcon = item.type === "event" ? <Calendar className="h-3 w-3 text-blue-500" /> : item.type === "reminder" ? <Bell className="h-3 w-3 text-yellow-500" /> : <Clock className="h-3 w-3 text-green-500" />;
                const typeLabel = item.type === "event" ? "Событие" : item.type === "reminder" ? "Напоминание" : "Отложенное";
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        {typeIcon}
                        <h4 className="font-medium text-sm">{item.title}</h4>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{typeLabel}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(item.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {item.chatName && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" /> {item.chatName}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <EventFormModal
          event={editingEvent}
          onClose={() => { setShowCreate(false); setEditingEvent(null); }}
          onSaved={() => { setShowCreate(false); setEditingEvent(null); fetchEvents(); }}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

function EventFormModal({
  event,
  onClose,
  onSaved,
  selectedDate,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
  selectedDate: Date | null;
}) {
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [description, setDescription] = React.useState(event?.description ?? "");
  const [location, setLocation] = React.useState(event?.location ?? "");
  const [date, setDate] = React.useState(
    event ? new Date(event.startsAt).toISOString().slice(0, 10)
      : (selectedDate ?? new Date()).toISOString().slice(0, 10),
  );
  const [time, setTime] = React.useState(
    event ? new Date(event.startsAt).toISOString().slice(11, 16) : "12:00",
  );
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Введите название"); return; }
    setSaving(true);
    try {
      const startsAt = new Date(`${date}T${time}:00`).toISOString();
      const body = { title: title.trim(), description: description || null, location: location || null, startsAt };
      const url = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(event ? "Событие обновлено" : "Событие создано");
        onSaved();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{event ? "Редактировать" : "Новое событие"}</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Место"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-accent">
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "..." : event ? "Сохранить" : "Создать"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
