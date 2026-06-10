"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Briefcase, Plus, X, Users, UserSearch, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";

const CATEGORIES = [
  { id: "development", label: "Разработка" },
  { id: "design", label: "Дизайн" },
  { id: "marketing", label: "Маркетинг" },
  { id: "video", label: "Видео" },
  { id: "other", label: "Другое" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Открыто", color: "bg-green-500/10 text-green-500" },
  in_progress: { label: "В работе", color: "bg-blue-500/10 text-blue-500" },
  completed: { label: "Завершено", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Отменено", color: "bg-red-500/10 text-red-500" },
};

const APPLICATION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидает", color: "bg-amber-500/10 text-amber-500" },
  accepted: { label: "Принята", color: "bg-green-500/10 text-green-500" },
  rejected: { label: "Отклонена", color: "bg-red-500/10 text-red-500" },
};

interface TeamExchangeListing {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  type: string;
  category: string;
  skills: string[];
  budget: number | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  creator: { id: string; username: string; displayName: string; avatarUrl: string | null };
  _count?: { applications: number };
  applications?: TeamExchangeApplication[];
}

interface TeamExchangeApplication {
  id: string;
  listingId: string;
  applicantId: string;
  message: string | null;
  status: string;
  createdAt: string;
  applicant?: { id: string; username: string; displayName: string; avatarUrl: string | null };
  listing?: { id: string; title: string; type: string; category: string; creator?: { id: string; username: string; displayName: string; avatarUrl: string | null } };
}

export default function TeamExchangePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [tab, setTab] = React.useState<"looking_for_team" | "looking_for_members">("looking_for_team");
  const [category, setCategory] = React.useState<string | null>(null);
  const [viewTab, setViewTab] = React.useState<"listings" | "my_apps" | "received_apps">("listings");
  const [listings, setListings] = React.useState<TeamExchangeListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<TeamExchangeListing | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [applyModal, setApplyModal] = React.useState<TeamExchangeListing | null>(null);
  const [applyMessage, setApplyMessage] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const [myApps, setMyApps] = React.useState<TeamExchangeApplication[]>([]);
  const [receivedApps, setReceivedApps] = React.useState<TeamExchangeApplication[]>([]);

  React.useEffect(() => {
    if (userLoading) return;
    if (!user) { router.push("/login"); return; }
  }, [user, userLoading, router]);

  const fetchListings = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: tab });
      if (category) params.set("category", category);
      const res = await fetch(`/api/team-exchange?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, category]);

  const fetchMyApps = React.useCallback(async () => {
    const res = await fetch("/api/team-exchange/applications?tab=sent", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setMyApps(data.applications ?? []);
    }
  }, []);

  const fetchReceivedApps = React.useCallback(async () => {
    const res = await fetch("/api/team-exchange/applications?tab=received", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setReceivedApps(data.applications ?? []);
    }
  }, []);

  React.useEffect(() => {
    if (viewTab === "listings") fetchListings();
    else if (viewTab === "my_apps") fetchMyApps();
    else fetchReceivedApps();
  }, [viewTab, fetchListings, fetchMyApps, fetchReceivedApps]);

  const handleApply = async () => {
    if (!applyModal || !applyMessage.trim()) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/team-exchange/${applyModal.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: applyMessage }),
      });
      if (res.ok) {
        setApplyModal(null);
        setApplyMessage("");
        alert("Заявка отправлена!");
        fetchListings();
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка");
      }
    } finally {
      setApplying(false);
    }
  };

  const handleAppAction = async (appId: string, status: string) => {
    const res = await fetch("/api/team-exchange/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ applicationId: appId, status }),
    });
    if (res.ok) fetchReceivedApps();
  };

  const formatBudget = (b: number | null) => {
    if (b === null) return "Договорная";
    return `${(b / 100).toLocaleString("ru-RU")} ₽`;
  };

  const formatDeadline = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  if (userLoading || !user) return <div className="flex h-screen items-center justify-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Briefcase className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Биржа команд</h1>
        <div className="ml-auto flex items-center gap-2">
          {viewTab === "listings" && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110">
              <Plus className="h-4 w-4" /> Создать
            </button>
          )}
          <button onClick={() => router.back()} className="rounded-md p-1.5 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Main tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setViewTab("listings")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", viewTab === "listings" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
          Объявления
        </button>
        <button onClick={() => setViewTab("my_apps")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", viewTab === "my_apps" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
          Мои заявки
        </button>
        <button onClick={() => setViewTab("received_apps")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", viewTab === "received_apps" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
          Полученные
        </button>
      </div>

      {viewTab === "listings" && (
        <>
          {/* Type tabs */}
          <div className="flex border-b border-border">
            <button onClick={() => setTab("looking_for_team")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5", tab === "looking_for_team" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <UserSearch className="h-4 w-4" /> Ищу команду
            </button>
            <button onClick={() => setTab("looking_for_members")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5", tab === "looking_for_members" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <Users className="h-4 w-4" /> Ищу участников
            </button>
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2">
            <button onClick={() => setCategory(null)} className={cn("whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors", !category ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent")}>
              Все
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} className={cn("whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors", category === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent")}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Listings */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
            ) : listings.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Нет объявлений</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <button key={l.id} onClick={() => setDetail(l)} className="flex flex-col items-start rounded-lg border border-border p-4 text-left hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {l.creator.displayName?.[0] ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{l.creator.displayName}</div>
                        <div className="truncate text-[10px] text-muted-foreground">@{l.creator.username}</div>
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold mb-1 line-clamp-2">{l.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{l.description}</p>
                    {l.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {l.skills.slice(0, 3).map((s) => (
                          <span key={s} className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] text-secondary-foreground">{s}</span>
                        ))}
                        {l.skills.length > 3 && <span className="text-[9px] text-muted-foreground">+{l.skills.length - 3}</span>}
                      </div>
                    )}
                    <div className="mt-auto flex items-center gap-2">
                      <span className="text-xs font-medium text-primary">{formatBudget(l.budget)}</span>
                      <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-500">
                        {CATEGORY_LABELS[l.category] ?? l.category}
                      </span>
                      {l.deadline && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {formatDeadline(l.deadline)}
                        </span>
                      )}
                      {l._count && (
                        <span className="text-[10px] text-muted-foreground">{l._count.applications} заявок</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {viewTab === "my_apps" && (
        <div className="flex-1 overflow-auto p-4">
          {myApps.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Вы пока не подавали заявок</div>
          ) : (
            <div className="space-y-3">
              {myApps.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">{a.listing?.title}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", APPLICATION_STATUS[a.status]?.color)}>
                      {APPLICATION_STATUS[a.status]?.label}
                    </span>
                  </div>
                  {a.listing?.creator && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Автор: {a.listing.creator.displayName} (@{a.listing.creator.username})
                    </div>
                  )}
                  {a.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewTab === "received_apps" && (
        <div className="flex-1 overflow-auto p-4">
          {receivedApps.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет полученных заявок</div>
          ) : (
            <div className="space-y-3">
              {receivedApps.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {a.applicant?.displayName?.[0] ?? "?"}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{a.applicant?.displayName}</div>
                        <div className="text-[10px] text-muted-foreground">@{a.applicant?.username}</div>
                      </div>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", APPLICATION_STATUS[a.status]?.color)}>
                      {APPLICATION_STATUS[a.status]?.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Объявление: {a.listing?.title}
                  </div>
                  {a.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.message}</p>}
                  {a.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleAppAction(a.id, "accepted")} className="flex items-center gap-1 rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20">
                        <CheckCircle className="h-3.5 w-3.5" /> Принять
                      </button>
                      <button onClick={() => handleAppAction(a.id, "rejected")} className="flex items-center gap-1 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20">
                        <XCircle className="h-3.5 w-3.5" /> Отклонить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetail(null)}>
          <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold">{detail.title}</h2>
              <button onClick={() => setDetail(null)} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {detail.creator.displayName?.[0] ?? "?"}
                </div>
                <div>
                  <div className="text-sm font-medium">{detail.creator.displayName}</div>
                  <div className="text-xs text-muted-foreground">@{detail.creator.username}</div>
                </div>
                <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_LABELS[detail.status]?.color)}>
                  {STATUS_LABELS[detail.status]?.label}
                </span>
              </div>

              <div className="flex gap-2">
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-500">
                  {CATEGORY_LABELS[detail.category] ?? detail.category}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                  {detail.type === "looking_for_team" ? "Ищу команду" : "Ищу участников"}
                </span>
              </div>

              <p className="text-sm whitespace-pre-wrap">{detail.description}</p>

              {detail.skills.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Навыки</div>
                  <div className="flex flex-wrap gap-1">
                    {detail.skills.map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-accent/50 p-3">
                  <div className="text-xs text-muted-foreground">Бюджет</div>
                  <div className="text-sm font-semibold">{formatBudget(detail.budget)}</div>
                </div>
                {detail.deadline && (
                  <div className="rounded-lg bg-accent/50 p-3">
                    <div className="text-xs text-muted-foreground">Дедлайн</div>
                    <div className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {formatDeadline(detail.deadline)}
                    </div>
                  </div>
                )}
              </div>

              {detail.applications && detail.applications.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Заявки ({detail.applications.length})</div>
                  {detail.applications.map((a) => (
                    <div key={a.id} className="mb-2 rounded-lg border border-border p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {a.applicant?.displayName?.[0] ?? "?"}
                          </div>
                          <span className="text-xs font-medium">{a.applicant?.displayName}</span>
                        </div>
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", APPLICATION_STATUS[a.status]?.color)}>
                          {APPLICATION_STATUS[a.status]?.label}
                        </span>
                      </div>
                      {a.message && <p className="text-xs text-muted-foreground mt-1">{a.message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {detail.creator.id !== user?.id && detail.status === "open" && (
              <div className="border-t border-border p-4">
                <button onClick={() => { setDetail(null); setApplyModal(detail); }} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110">
                  Откликнуться
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply modal */}
      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setApplyModal(null)}>
          <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">Откликнуться: {applyModal.title}</h3>
            <textarea value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} placeholder="Расскажите о себе и почему вы подходите..." className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-24 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setApplyModal(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Отмена</button>
              <button onClick={handleApply} disabled={applying || !applyMessage.trim()} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {applying ? "..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && <CreateTeamExchangeModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchListings(); }} />}
    </div>
  );
}

function CreateTeamExchangeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = React.useState<"looking_for_team" | "looking_for_members">("looking_for_team");
  const [category, setCategory] = React.useState("development");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [skills, setSkills] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!title || !description) return;
    setSaving(true);
    try {
      const res = await fetch("/api/team-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          type,
          category,
          skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
          budget: budget ? Math.round(parseFloat(budget) * 100) : null,
          deadline: deadline || null,
        }),
      });
      if (res.ok) onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex w-full max-w-md flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold">Новое объявление</h3>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setType("looking_for_team")} className={cn("flex-1 rounded-md border px-3 py-1.5 text-xs font-medium", type === "looking_for_team" ? "border-primary bg-primary/10 text-primary" : "border-border")}>
            <UserSearch className="h-3.5 w-3.5 inline mr-1" /> Ищу команду
          </button>
          <button onClick={() => setType("looking_for_members")} className={cn("flex-1 rounded-md border px-3 py-1.5 text-xs font-medium", type === "looking_for_members" ? "border-primary bg-primary/10 text-primary" : "border-border")}>
            <Users className="h-3.5 w-3.5 inline mr-1" /> Ищу участников
          </button>
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название проекта" className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание проекта, задачи, требования..." className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-24 resize-none" />
        <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Навыки (через запятую): React, Node.js, UI/UX" className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Бюджет (₽)" className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Отмена</button>
          <button onClick={handleSave} disabled={saving || !title || !description} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
