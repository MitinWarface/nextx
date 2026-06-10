"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "@/store/toast-store";
import { MiniAppModal } from "@/components/mini-apps/mini-app-modal";
import {
  Star,
  Download,
  Search,
  Package,
  Gamepad2,
  Briefcase,
  DollarSign,
  Sparkles,
  Film,
  LayoutGrid,
} from "lucide-react";

interface MiniApp {
  id: string;
  name: string;
  description: string | null;
  miniAppUrl: string | null;
  miniAppIcon: string | null;
  miniAppDescription: string | null;
  miniAppCategory: string | null;
  miniAppScreenshots: string[];
  miniAppRating: number;
  miniAppInstalls: number;
  miniAppVersion: string | null;
  isPublished: boolean;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { id: string; displayName: string; avatarUrl: string | null };
  }>;
}

interface AppDetail extends MiniApp {
  _count?: { reviews: number };
}

const CATEGORIES = [
  { key: "all", label: "Все", icon: LayoutGrid },
  { key: "games", label: "Игры", icon: Gamepad2 },
  { key: "business", label: "Бизнес", icon: Briefcase },
  { key: "finance", label: "Финансы", icon: DollarSign },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "entertainment", label: "Развлечения", icon: Film },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Новинки" },
  { key: "rating", label: "По рейтингу" },
  { key: "installs", label: "По популярности" },
  { key: "name", label: "По имени" },
];

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

export default function AppsPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [apps, setApps] = React.useState<MiniApp[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("newest");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedApp, setSelectedApp] = React.useState<AppDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [launcherOpen, setLauncherOpen] = React.useState(false);
  const [launcherUrl, setLauncherUrl] = React.useState("");
  const [launcherTitle, setLauncherTitle] = React.useState("");

  // Review state
  const [myRating, setMyRating] = React.useState(0);
  const [myComment, setMyComment] = React.useState("");
  const [submittingReview, setSubmittingReview] = React.useState(false);

  const loadApps = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sortBy });
      if (activeCategory !== "all") params.set("category", activeCategory);

      const res = await fetch(`/api/mini-apps?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps ?? []);
      }
    } catch {
      toast.error("Не удалось загрузить приложения");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortBy]);

  React.useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const loadAppDetail = React.useCallback(async (appId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/mini-apps/${appId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedApp(data.app);
      }
    } catch {
      toast.error("Не удалось загрузить-details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleAppClick = React.useCallback(
    (app: MiniApp) => {
      void loadAppDetail(app.id);
    },
    [loadAppDetail],
  );

  const handleLaunch = React.useCallback(
    async (app: MiniApp) => {
      if (!app.miniAppUrl) {
        toast.error("URL приложения не настроен");
        return;
      }
      try {
        const res = await fetch(`/api/mini-apps/${app.id}/launch`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setLauncherUrl(data.miniAppUrl);
          setLauncherTitle(app.name);
          setLauncherOpen(true);
          // Update install count locally
          setApps((prev) =>
            prev.map((a) =>
              a.id === app.id
                ? { ...a, miniAppInstalls: a.miniAppInstalls + 1 }
                : a,
            ),
          );
        } else {
          toast.error("Не удалось запустить приложение");
        }
      } catch {
        toast.error("Ошибка сети");
      }
    },
    [],
  );

  const handleSubmitReview = React.useCallback(async () => {
    if (!selectedApp || myRating < 1) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/app-reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: selectedApp.id,
          rating: myRating,
          comment: myComment.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Отзыв отправлен");
        setMyRating(0);
        setMyComment("");
        void loadAppDetail(selectedApp.id);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Не удалось отправить отзыв");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSubmittingReview(false);
    }
  }, [selectedApp, myRating, myComment, loadAppDetail]);

  const filteredApps = React.useMemo(() => {
    if (!searchQuery.trim()) return apps;
    const q = searchQuery.toLowerCase();
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.miniAppDescription?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q),
    );
  }, [apps, searchQuery]);

  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-sm">Загрузка...</div>
      </div>
    );
  }

  // Detail view
  if (selectedApp) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {detailLoading ? (
          <div className="flex h-screen items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl p-4 space-y-6">
            <button
              type="button"
              onClick={() => setSelectedApp(null)}
              className="text-sm text-primary hover:underline"
            >
              ← Назад к каталогу
            </button>

            <div className="flex gap-4">
              <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {selectedApp.miniAppIcon ? (
                  <img
                    src={selectedApp.miniAppIcon}
                    alt={selectedApp.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">{selectedApp.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {selectedApp.user.displayName}
                </p>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {selectedApp.miniAppRating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {selectedApp.miniAppInstalls.toLocaleString()}
                  </span>
                  {selectedApp.miniAppVersion && (
                    <span className="text-xs text-muted-foreground">
                      v{selectedApp.miniAppVersion}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedApp.miniAppDescription && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedApp.miniAppDescription}
              </p>
            )}

            {/* Screenshots */}
            {selectedApp.miniAppScreenshots.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {selectedApp.miniAppScreenshots.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="h-40 flex-shrink-0 rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => handleLaunch(selectedApp)}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Открыть
            </button>

            {/* Reviews */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Отзывы</h2>

              {/* Write review */}
              {user && (
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ваша оценка:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setMyRating(i)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-5 w-5 transition-colors ${
                              i <= myRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30 hover:text-amber-400/50"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    placeholder="Напишите отзыв (необязательно)..."
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm resize-none"
                    rows={3}
                  />
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={myRating < 1 || submittingReview}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {submittingReview ? "Отправка..." : "Написать отзыв"}
                  </button>
                </div>
              )}

              {/* Review list */}
              <div className="space-y-3">
                {selectedApp.reviews?.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-border p-4 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold overflow-hidden">
                        {review.user.avatarUrl ? (
                          <img
                            src={review.user.avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          review.user.displayName[0]
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {review.user.displayName}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("ru")}
                        </span>
                      </div>
                      <StarRating rating={review.rating} size={14} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
                {(!selectedApp.reviews || selectedApp.reviews.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Пока нет отзывов
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mini App Launcher */}
        <MiniAppModal
          open={launcherOpen}
          onClose={() => setLauncherOpen(false)}
          appUrl={launcherUrl}
          title={launcherTitle}
        />
      </div>
    );
  }

  // Catalog view
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Мини-приложения</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск приложений..."
            className="w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Сортировка:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* App grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">Приложений не найдено</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => handleAppClick(app)}
                className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-accent/50"
              >
                <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                  {app.miniAppIcon ? (
                    <img
                      src={app.miniAppIcon}
                      alt={app.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{app.name}</div>
                  {app.miniAppCategory && (
                    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground mt-0.5">
                      {CATEGORIES.find((c) => c.key === app.miniAppCategory)?.label ?? app.miniAppCategory}
                    </span>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {app.miniAppRating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {app.miniAppInstalls.toLocaleString()}
                    </span>
                  </div>
                  {app.miniAppDescription && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {app.miniAppDescription}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
