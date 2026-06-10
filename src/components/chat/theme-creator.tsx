"use client";

import * as React from "react";
import { Palette, Plus, Trash2, Check } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    primaryFg: string;
    accent: string;
    accentFg: string;
    muted: string;
    mutedFg: string;
    border: string;
    bubbleIncoming: string;
    bubbleIncomingFg: string;
    bubbleOutgoing: string;
    bubbleOutgoingFg: string;
  };
}

const DEFAULT_COLORS: CustomTheme["colors"] = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  primary: "#6366f1",
  primaryFg: "#ffffff",
  accent: "#f4f4f5",
  accentFg: "#18181b",
  muted: "#f4f4f5",
  mutedFg: "#71717a",
  border: "#e4e4e7",
  bubbleIncoming: "#f4f4f5",
  bubbleIncomingFg: "#18181b",
  bubbleOutgoing: "#6366f1",
  bubbleOutgoingFg: "#ffffff",
};

const DARK_COLORS: CustomTheme["colors"] = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  primary: "#6366f1",
  primaryFg: "#ffffff",
  accent: "#27272a",
  accentFg: "#fafafa",
  muted: "#27272a",
  mutedFg: "#a1a1aa",
  border: "#27272a",
  bubbleIncoming: "#27272a",
  bubbleIncomingFg: "#fafafa",
  bubbleOutgoing: "#4f46e5",
  bubbleOutgoingFg: "#ffffff",
};

function loadCustomThemes(): CustomTheme[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("nextx-themes") || "[]");
  } catch {
    return [];
  }
}

function saveCustomThemes(themes: CustomTheme[]) {
  localStorage.setItem("nextx-themes", JSON.stringify(themes));
}

function applyTheme(theme: CustomTheme) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
}

export function ThemeCreator() {
  const { theme: activeTheme } = useTheme();
  const [themes, setThemes] = React.useState<CustomTheme[]>([]);
  const [editing, setEditing] = React.useState<CustomTheme | null>(null);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    setThemes(loadCustomThemes());
    setIsDark(activeTheme === "dark");
  }, [activeTheme]);

  const colors = editing?.colors ?? (isDark ? DARK_COLORS : DEFAULT_COLORS);

  const updateColor = (key: keyof CustomTheme["colors"], value: string) => {
    if (!editing) return;
    setEditing({ ...editing, colors: { ...editing.colors, [key]: value } });
  };

  const createNew = () => {
    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: "Моя тема",
      colors: { ...(isDark ? DARK_COLORS : DEFAULT_COLORS) },
    };
    setEditing(newTheme);
  };

  const save = () => {
    if (!editing) return;
    const exists = themes.findIndex((t) => t.id === editing.id);
    let updated: CustomTheme[];
    if (exists >= 0) {
      updated = [...themes];
      updated[exists] = editing;
    } else {
      updated = [...themes, editing];
    }
    setThemes(updated);
    saveCustomThemes(updated);
    applyTheme(editing);
    setEditing(null);
  };

  const remove = (id: string) => {
    const updated = themes.filter((t) => t.id !== id);
    setThemes(updated);
    saveCustomThemes(updated);
  };

  const activate = (theme: CustomTheme) => {
    applyTheme(theme);
  };

  const COLOR_LABELS: Record<string, string> = {
    background: "Фон",
    foreground: "Текст",
    primary: "Основной",
    primaryFg: "Текст на основном",
    accent: "Акцент",
    accentFg: "Текст на акценте",
    muted: "Приглушённый",
    mutedFg: "Текст приглушённый",
    border: "Граница",
    bubbleIncoming: "Входящее сообщение",
    bubbleIncomingFg: "Текст входящего",
    bubbleOutgoing: "Исходящее сообщение",
    bubbleOutgoingFg: "Текст исходящего",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Пользовательские темы</h3>
        <button
          type="button"
          onClick={createNew}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Создать
        </button>
      </div>

      {/* Saved themes */}
      {themes.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {themes.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-accent cursor-pointer",
                editing?.id === t.id && "ring-2 ring-primary",
              )}
              onClick={() => activate(t)}
            >
              <div className="flex gap-1">
                <div className="h-4 w-4 rounded-full border" style={{ background: t.colors.primary }} />
                <div className="h-4 w-4 rounded-full border" style={{ background: t.colors.background }} />
                <div className="h-4 w-4 rounded-full border" style={{ background: t.colors.bubbleOutgoing }} />
              </div>
              <span className="flex-1 truncate text-xs">{t.name}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditing(t); }}
                className="rounded p-1 hover:bg-accent"
              >
                <Palette className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
              placeholder="Название темы"
            />
            <button
              type="button"
              onClick={save}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5" />
              Сохранить
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(COLOR_LABELS) as Array<keyof typeof COLOR_LABELS>).map((key) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key as keyof CustomTheme["colors"]]}
                  onChange={(e) => updateColor(key as keyof CustomTheme["colors"], e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">{COLOR_LABELS[key]}</p>
                  <p className="font-mono text-[10px] text-muted-foreground/60">
                    {colors[key as keyof CustomTheme["colors"]]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
