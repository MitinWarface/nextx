"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light" as const, icon: Sun, label: "Светлая" },
    { value: "dark" as const, icon: Moon, label: "Тёмная" },
    { value: "system" as const, icon: Monitor, label: "Система" },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
