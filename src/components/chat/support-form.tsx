"use client";

import * as React from "react";
import { X, Send, MessageSquare, Bug, Lightbulb, CreditCard, HelpCircle } from "lucide-react";
import { toast } from "@/store/toast-store";

interface SupportFormProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: "GENERAL", label: "Общий вопрос", icon: HelpCircle },
  { value: "BUG", label: "Сообщить об ошибке", icon: Bug },
  { value: "FEATURE", label: "Предложить функцию", icon: Lightbulb },
  { value: "PAYMENT", label: "Вопрос по оплате", icon: CreditCard },
] as const;

export function SupportForm({ open, onClose }: SupportFormProps) {
  const [category, setCategory] = React.useState<string>("GENERAL");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Заполните тему и сообщение");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category, subject: subject.trim(), message: message.trim() }),
      });
      if (res.ok) {
        toast.success("Обращение отправлено! Мы ответим в ближайшее время.");
        onClose();
        setSubject("");
        setMessage("");
      } else {
        toast.error("Ошибка отправки");
      }
    } catch { toast.error("Ошибка сети"); } finally { setSending(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Задать вопрос</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Опишите вашу проблему или вопрос. Наша команда поддержки свяжется с вами.
        </p>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-muted-foreground">Категория</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors ${category === cat.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/50"}`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-muted-foreground">Тема</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Кратко опишите проблему"
            maxLength={200}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-muted-foreground">Сообщение</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Подробно опишите вашу проблему или вопрос..."
            rows={5}
            maxLength={2000}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/2000</p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={sending || !subject.trim() || !message.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? "Отправка..." : "Отправить обращение"}
        </button>
      </div>
    </div>
  );
}
