"use client";

import * as React from "react";
import { X, Plus, Trash2, Loader2, UserCheck, UserX, HelpCircle } from "lucide-react";
import { toast } from "@/store/toast-store";

interface JoinRequestItem {
  id: string;
  userId: string;
  answers: string[] | null;
  status: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
}

interface JoinQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

export function JoinQuestionsModal({ open, onClose, chatId }: JoinQuestionsModalProps) {
  const [tab, setTab] = React.useState<"questions" | "requests">("questions");
  const [questions, setQuestions] = React.useState<string[]>([]);
  const [requests, setRequests] = React.useState<JoinRequestItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newQuestion, setNewQuestion] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const loadQuestions = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}/join-questions`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setQuestions(d.questions ?? []);
      }
    } catch {}
  }, [chatId]);

  const loadRequests = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}/join-requests`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setRequests(d.requests ?? []);
      }
    } catch {}
  }, [chatId]);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([loadQuestions(), loadRequests()]).finally(() => setLoading(false));
  }, [open, loadQuestions, loadRequests]);

  const handleSaveQuestions = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/join-questions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (res.ok) {
        toast.success("Вопросы сохранены");
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    if (!newQuestion.trim() || questions.length >= 10) return;
    setQuestions([...questions, newQuestion.trim()]);
    setNewQuestion("");
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleRequest = async (id: string, status: "approved" | "rejected") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/chats/${chatId}/join-requests`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(status === "approved" ? "Заявка одобрена" : "Заявка отклонена");
        loadRequests();
      } else {
        toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setProcessingId(null);
    }
  };

  const cancelRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/join-requests`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Заявка отменена");
        loadRequests();
      }
    } catch {
      toast.error("Ошибка сети");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Анкета при вступлении</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex border-b border-border px-2">
          <button
            type="button"
            onClick={() => setTab("questions")}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === "questions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="mr-1 inline h-3.5 w-3.5" /> Вопросы
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="mr-1 inline h-3.5 w-3.5" /> Заявки ({requests.length})
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка...
            </div>
          ) : tab === "questions" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Задайте вопросы, которые будут показаны новым участникам при вступлении (макс. 10).
              </p>
              {questions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                  <span className="mt-0.5 text-xs text-muted-foreground">{idx + 1}.</span>
                  <p className="flex-1 text-sm">{q}</p>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {questions.length < 10 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Новый вопрос..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                    className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addQuestion}
                    disabled={!newQuestion.trim()}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleSaveQuestions}
                disabled={saving}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Сохранить вопросы"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет ожидающих заявок</p>
              ) : (
                requests.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r.user.avatarUrl ? (
                          <img src={r.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {r.user.displayName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{r.user.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{r.user.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleRequest(r.id, "approved")}
                          disabled={processingId === r.id}
                          className="rounded p-1.5 text-green-600 hover:bg-green-500/10 disabled:opacity-50"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequest(r.id, "rejected")}
                          disabled={processingId === r.id}
                          className="rounded p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {r.answers && r.answers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {r.answers.map((a, i) => (
                          <div key={i} className="rounded bg-muted px-2 py-1 text-xs">
                            <span className="text-muted-foreground">Ответ {i + 1}:</span> {a}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("ru")}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
