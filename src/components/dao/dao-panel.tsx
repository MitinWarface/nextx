"use client";

import * as React from "react";
import { X, Plus, Vote, Clock, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { toast } from "@/store/toast-store";

interface DaoProposal {
  id: string;
  title: string;
  description: string;
  options: string[];
  status: string;
  createdAt: string;
  endsAt: string;
  creator: { id: string; username: string; displayName: string; avatarUrl: string | null };
  votes: { userId: string; option: string; weight: number }[];
}

interface DaoPanelProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <Clock className="h-4 w-4 text-yellow-500" />,
  passed: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
  executed: <CheckCircle className="h-4 w-4 text-blue-500" />,
};

export function DaoPanel({ open, onClose, chatId }: DaoPanelProps) {
  const [proposals, setProposals] = React.useState<DaoProposal[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [optionsStr, setOptionsStr] = React.useState("Yes, No, Abstain");
  const [endsIn, setEndsIn] = React.useState("7d");
  const [selected, setSelected] = React.useState<DaoProposal | null>(null);
  const [voting, setVoting] = React.useState<string | null>(null);

  const fetchProposals = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dao/proposals?chatId=${chatId}`, { credentials: "include" });
      const data = await res.json();
      setProposals(data.proposals ?? []);
    } catch {} finally { setLoading(false); }
  }, [chatId]);

  React.useEffect(() => { if (open) fetchProposals(); }, [open, fetchProposals]);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) { toast.error("Заполните все поля"); return; }
    const options = optionsStr.split(",").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) { toast.error("Нужно минимум 2 варианта"); return; }
    const ms = parseDuration(endsIn);
    const endsAt = new Date(Date.now() + ms).toISOString();
    setCreating(true);
    try {
      const res = await fetch("/api/dao/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chatId, title, description, options, endsAt }),
      });
      if (res.ok) {
        toast.success("Пропозиция создана");
        setTitle(""); setDescription(""); setCreating(false);
        fetchProposals();
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка");
      }
    } catch { toast.error("Ошибка сети"); } finally { setCreating(false); }
  };

  const handleVote = async (proposalId: string, option: string) => {
    setVoting(proposalId);
    try {
      const res = await fetch(`/api/dao/proposals/${proposalId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ option }),
      });
      if (res.ok) {
        toast.success("Голос учтён");
        fetchProposals();
      } else {
        const err = await res.json();
        toast.error(err.error || "Ошибка голосования");
      }
    } catch { toast.error("Ошибка сети"); } finally { setVoting(null); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Vote className="h-5 w-5" /> DAO Голосования</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selected ? (
            <div>
              <button type="button" onClick={() => setSelected(null)} className="mb-3 text-sm text-muted-foreground hover:underline">&larr; Назад</button>
              <h3 className="text-lg font-semibold">{selected.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {STATUS_ICONS[selected.status]}
                <span>Статус: {selected.status}</span>
                <span>&bull;</span>
                <span>до {new Date(selected.endsAt).toLocaleDateString("ru-RU")}</span>
              </div>
              <div className="mt-4 space-y-2">
                {selected.options.map((opt) => {
                  const totalWeight = selected.votes.reduce((s, v) => s + v.weight, 0);
                  const optWeight = selected.votes.filter((v) => v.option === opt).reduce((s, v) => s + v.weight, 0);
                  const pct = totalWeight > 0 ? Math.round((optWeight / totalWeight) * 100) : 0;
                  const myVote = selected.votes.find((v) => v.userId === (selected as any).myUserId);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleVote(selected.id, opt)}
                      disabled={voting === selected.id || selected.status !== "active" || new Date() > new Date(selected.endsAt)}
                      className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{opt}</span>
                        <span className="text-sm text-muted-foreground">{pct}% ({optWeight} NC)</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-dashed border-border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Plus className="h-4 w-4" />
                  Новая пропозиция
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" className="mb-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" rows={3} className="mb-2 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none" />
                <div className="mb-2 flex gap-2">
                  <input value={optionsStr} onChange={(e) => setOptionsStr(e.target.value)} placeholder="Варианты через запятую" className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                  <select value={endsIn} onChange={(e) => setEndsIn(e.target.value)} className="rounded-md border border-input bg-transparent px-2 py-2 text-sm">
                    <option value="1d">1 день</option>
                    <option value="3d">3 дня</option>
                    <option value="7d">7 дней</option>
                    <option value="14d">14 дней</option>
                  </select>
                </div>
                <button type="button" onClick={handleCreate} disabled={creating || !title.trim()} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {creating ? "Создание..." : "Создать пропозицию"}
                </button>
              </div>

              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Загрузка...</p>
              ) : proposals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Пока нет пропозиций</p>
              ) : (
                <div className="space-y-3">
                  {proposals.map((p) => {
                    const totalWeight = p.votes.reduce((s, v) => s + v.weight, 0);
                    return (
                      <button key={p.id} type="button" onClick={() => setSelected(p)} className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{p.title}</h4>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {STATUS_ICONS[p.status]}
                            <span className="text-xs text-muted-foreground">{p.status}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{p.votes.length} голосов</span>
                          <span>{totalWeight} NC</span>
                          <span>до {new Date(p.endsAt).toLocaleDateString("ru-RU")}</span>
                          <span>от {p.creator.displayName}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function parseDuration(s: string): number {
  const m = s.match(/^(\d+)([dhm])$/);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(m[1]);
  switch (m[2]) {
    case "d": return n * 24 * 60 * 60 * 1000;
    case "h": return n * 60 * 60 * 1000;
    case "m": return n * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}
