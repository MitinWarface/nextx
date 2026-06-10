"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Loader2, HelpCircle } from "lucide-react";
import { toast } from "@/store/toast-store";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

interface GroupFaqProps {
  chatId: string;
}

export function GroupFaq({ chatId }: GroupFaqProps) {
  const [faqs, setFaqs] = React.useState<FaqItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [newQ, setNewQ] = React.useState("");
  const [newA, setNewA] = React.useState("");
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/faq`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setFaqs(d.faqs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  React.useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/faq`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newQ.trim(),
          answer: newA.trim(),
          sortOrder: faqs.length,
        }),
      });
      if (res.ok) {
        toast.success("FAQ добавлен");
        setNewQ("");
        setNewA("");
        setAdding(false);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === "not_authorized" ? "Нет прав" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/chats/${chatId}/faq`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("FAQ удалён");
        load();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setDeleting(null);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">FAQ группы</h3>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3 w-3" /> Добавить
        </button>
      </div>

      {adding && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <input
            type="text"
            placeholder="Вопрос"
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
          />
          <textarea
            placeholder="Ответ"
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newQ.trim() || !newA.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewQ(""); setNewA(""); }}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {faqs.length === 0 && !adding && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Нет вопросов. Добавьте первый FAQ.
        </p>
      )}

      {faqs.map((faq) => (
        <div key={faq.id} className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
            className="flex w-full items-center justify-between p-3 text-left"
          >
            <span className="text-sm font-medium">{faq.question}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }}
                disabled={deleting === faq.id}
                className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {deleting === faq.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
              {expandedId === faq.id ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {expandedId === faq.id && (
            <div className="border-t border-border px-3 pb-3 pt-2">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {faq.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
