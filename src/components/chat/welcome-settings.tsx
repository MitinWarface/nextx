"use client";

import * as React from "react";
import { MessageSquare, Save, Loader2 } from "lucide-react";
import { toast } from "@/store/toast-store";

interface WelcomeSettingsProps {
  chatId: string;
}

export function WelcomeSettings({ chatId }: WelcomeSettingsProps) {
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/chats/${chatId}/welcome`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMessage(d.welcomeMessage ?? ""))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chatId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/welcome`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ welcomeMessage: message || null }),
      });
      if (res.ok) {
        toast.success("Приветственное сообщение сохранено");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "not_authorized" ? "Нет прав" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Приветственное сообщение</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Сообщение будет отправлено новым участникам при входе в группу.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Введите приветственное сообщение..."
        rows={4}
        maxLength={2000}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {message.length}/2000
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Сохранить
        </button>
      </div>
    </div>
  );
}
