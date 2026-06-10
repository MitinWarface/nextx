"use client";

import * as React from "react";
import {
  Brain,
  StickyNote,
  CheckSquare,
  Calendar,
  Bell,
  Bookmark,
  Cloud,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HubWidget {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  count?: number;
  items?: { id: string; title: string; subtitle?: string }[];
}

const defaultWidgets: HubWidget[] = [
  { id: "notes", title: "Заметки", icon: <StickyNote className="h-5 w-5" />, color: "text-yellow-500", items: [] },
  { id: "tasks", title: "Задачи", icon: <CheckSquare className="h-5 w-5" />, color: "text-green-500", items: [] },
  { id: "calendar", title: "Календарь", icon: <Calendar className="h-5 w-5" />, color: "text-blue-500", items: [] },
  { id: "reminders", title: "Напоминания", icon: <Bell className="h-5 w-5" />, color: "text-purple-500", items: [] },
  { id: "bookmarks", title: "Закладки", icon: <Bookmark className="h-5 w-5" />, color: "text-pink-500", items: [] },
  { id: "files", title: "Файлы", icon: <Cloud className="h-5 w-5" />, color: "text-cyan-500", items: [] },
  { id: "drafts", title: "Черновики", icon: <FileText className="h-5 w-5" />, color: "text-orange-500", items: [] },
];

export default function HubPage() {
  const [widgets, setWidgets] = React.useState(defaultWidgets);
  const [activeWidget, setActiveWidget] = React.useState<string | null>(null);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar p-4">
        <div className="mb-6 flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">Hub</h1>
        </div>
        <nav className="space-y-1">
          {widgets.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setActiveWidget(activeWidget === w.id ? null : w.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                activeWidget === w.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
              )}
            >
              <span className={w.color}>{w.icon}</span>
              <span className="flex-1 text-left">{w.title}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Grid */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Персональная ОС</h2>
          <p className="text-sm text-muted-foreground">Всё в одном месте</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <div
              key={w.id}
              className={cn(
                "rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md",
                activeWidget === w.id && "ring-2 ring-primary",
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={w.color}>{w.icon}</span>
                  <h3 className="font-medium">{w.title}</h3>
                </div>
                {w.items && w.items.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {w.items.length}
                  </span>
                )}
              </div>
              {w.items && w.items.length > 0 ? (
                <ul className="space-y-2">
                  {w.items.map((item) => (
                    <li key={item.id} className="rounded-lg bg-accent/40 px-3 py-2 text-sm">
                      <div className="font-medium">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Пока пусто</p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
