"use client";

import * as React from "react";
import { Phone, Copy } from "lucide-react";
import { toast } from "@/store/toast-store";

export function VirtualNumberSection() {
  const [number, setNumber] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/users/me/virtual-number", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setNumber(d.virtualNumber ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/users/me/virtual-number", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setNumber(data.virtualNumber);
        toast.success("Номер получен");
      } else {
        toast.error(data.error === "premium_required" ? "Требуется подписка Premium" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (number) {
      navigator.clipboard.writeText(number);
      toast.success("Номер скопирован");
    }
  };

  if (loading) return null;

  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-semibold">Виртуальный номер</h3>
      {number ? (
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <code className="flex-1 text-sm font-mono">{number}</code>
            <button type="button" onClick={handleCopy} className="rounded-md border border-border p-1.5 hover:bg-accent">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50 disabled:opacity-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Phone className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-medium">{generating ? "Генерация..." : "Получить номер"}</p>
            <p className="text-xs text-muted-foreground">Только для Premium</p>
          </div>
        </button>
      )}
    </div>
  );
}
