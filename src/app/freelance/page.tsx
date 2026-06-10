"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Briefcase, Star, Plus, X, Search, Filter } from "lucide-react";

const CATEGORIES = [
  { id: "design", label: "Дизайн" },
  { id: "development", label: "Разработка" },
  { id: "marketing", label: "Маркетинг" },
  { id: "video", label: "Видео" },
  { id: "translation", label: "Переводы" },
  { id: "other", label: "Прочее" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

interface Listing {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  price: string | null;
  portfolio: string[];
  rating: number;
  isActive: boolean;
  createdAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  _count: { reviews: number; orders: number };
}

interface FreelanceDetail extends Listing {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  }>;
}

export default function FreelancePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [tab, setTab] = React.useState<"offer" | "request">("offer");
  const [category, setCategory] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<"newest" | "rating">("newest");
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<FreelanceDetail | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [orderModal, setOrderModal] = React.useState<FreelanceDetail | null>(null);
  const [orderDesc, setOrderDesc] = React.useState("");
  const [orderPrice, setOrderPrice] = React.useState("");
  const [ordering, setOrdering] = React.useState(false);

  React.useEffect(() => {
    if (userLoading) return;
    if (!user) { router.push("/login"); return; }
  }, [user, userLoading, router]);

  const fetchListings = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: tab, sort });
      if (category) params.set("category", category);
      const res = await fetch(`/api/freelance?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, category, sort]);

  React.useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleOrder = async () => {
    if (!orderModal || !orderDesc || !orderPrice) return;
    setOrdering(true);
    try {
      const res = await fetch(`/api/freelance/${orderModal.id}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: orderDesc, price: parseInt(orderPrice) }),
      });
      if (res.ok) {
        setOrderModal(null);
        setOrderDesc("");
        setOrderPrice("");
        alert("Заказ создан!");
      } else {
        const err = await res.json();
        alert(err.error || "Ошибка");
      }
    } finally {
      setOrdering(false);
    }
  };

  if (userLoading || !user) return <div className="flex h-screen items-center justify-center text-muted-foreground">Загрузка...</div>;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Briefcase className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Услуги</h1>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110">
            <Plus className="h-4 w-4" /> Создать
          </button>
          <button onClick={() => router.back()} className="rounded-md p-1.5 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setTab("offer")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", tab === "offer" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
          Предлагаю
        </button>
        <button onClick={() => setTab("request")} className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", tab === "request" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
          Ищу
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

      {/* Sort */}
      <div className="flex gap-2 px-4 py-1">
        <button onClick={() => setSort("newest")} className={cn("text-xs font-medium", sort === "newest" ? "text-primary" : "text-muted-foreground hover:text-foreground")}>Новые</button>
        <button onClick={() => setSort("rating")} className={cn("text-xs font-medium", sort === "rating" ? "text-primary" : "text-muted-foreground hover:text-foreground")}>По рейтингу</button>
      </div>

      {/* Listings grid */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
        ) : listings.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Нет объявлений</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <button key={l.id} onClick={() => setDetail(l as FreelanceDetail)} className="flex flex-col items-start rounded-lg border border-border p-4 text-left hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {l.user.displayName?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.user.displayName}</div>
                    <div className="truncate text-[10px] text-muted-foreground">@{l.user.username}</div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold mb-1 line-clamp-2">{l.title}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{l.description}</p>
                <div className="mt-auto flex items-center gap-2">
                  {l.price && <span className="text-xs font-medium text-primary">{l.price}</span>}
                  <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-500">
                    {CATEGORY_LABELS[l.category] ?? l.category}
                  </span>
                  {l.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                      <Star className="h-3 w-3 fill-amber-500" /> {l.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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
                  {detail.user.displayName?.[0] ?? "?"}
                </div>
                <div>
                  <div className="text-sm font-medium">{detail.user.displayName}</div>
                  <div className="text-xs text-muted-foreground">@{detail.user.username}</div>
                </div>
                {detail.rating > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-sm text-amber-500">
                    <Star className="h-4 w-4 fill-amber-500" /> {detail.rating.toFixed(1)} ({detail._count.reviews})
                  </span>
                )}
              </div>

              <div>
                <div className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-500 w-fit mb-2">
                  {CATEGORY_LABELS[detail.category] ?? detail.category}
                </div>
                <p className="text-sm whitespace-pre-wrap">{detail.description}</p>
              </div>

              {detail.price && (
                <div className="rounded-lg bg-accent/50 p-3">
                  <div className="text-xs text-muted-foreground">Цена</div>
                  <div className="text-sm font-semibold">{detail.price}</div>
                </div>
              )}

              {detail.portfolio.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">Портфолио</div>
                  <div className="flex gap-2 overflow-x-auto">
                    {detail.portfolio.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border text-[10px] text-primary hover:bg-accent">
                        Ссылка {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Отзывы ({detail._count.reviews})</div>
                {detail.reviews?.length === 0 && <p className="text-xs text-muted-foreground">Пока нет отзывов</p>}
                {detail.reviews?.map((r) => (
                  <div key={r.id} className="mb-2 rounded-lg border border-border p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{r.user.displayName}</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                        {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-500" />)}
                      </span>
                    </div>
                    {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
            {detail.user.id !== user?.id && (
              <div className="border-t border-border p-4">
                <button onClick={() => { setDetail(null); setOrderModal(detail); }} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110">
                  Заказать
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOrderModal(null)}>
          <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">Заказать: {orderModal.title}</h3>
            <textarea value={orderDesc} onChange={(e) => setOrderDesc(e.target.value)} placeholder="Опишите задачу..." className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-20 resize-none" />
            <input type="number" value={orderPrice} onChange={(e) => setOrderPrice(e.target.value)} placeholder="Цена (NC)" className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex gap-2">
              <button onClick={() => setOrderModal(null)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Отмена</button>
              <button onClick={handleOrder} disabled={ordering || !orderDesc || !orderPrice} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {ordering ? "..." : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && <CreateListingModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchListings(); }} />}
    </div>
  );
}

function CreateListingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = React.useState<"offer" | "request">("offer");
  const [category, setCategory] = React.useState("design");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!title || !description) return;
    setSaving(true);
    try {
      const res = await fetch("/api/freelance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, category, title, description, price: price || null }),
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
          <button onClick={() => setType("offer")} className={cn("flex-1 rounded-md border px-3 py-1.5 text-xs font-medium", type === "offer" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Предлагаю</button>
          <button onClick={() => setType("request")} className={cn("flex-1 rounded-md border px-3 py-1.5 text-xs font-medium", type === "request" ? "border-primary bg-primary/10 text-primary" : "border-border")}>Ищу</button>
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-20 resize-none" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder='Цена (например "от 5000 NC")' className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
