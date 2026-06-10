"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "@/store/toast-store";
import {
  Star,
  Download,
  Search,
  ShoppingCart,
  Tag,
  BookOpen,
  Bot,
  Package,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";

interface Listing {
  id: string;
  sellerId: string;
  type: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  downloads: number;
  rating: number;
  isPublished: boolean;
  createdAt: string;
  seller: { id: string; displayName: string; avatarUrl: string | null };
  _count: { reviews: number; purchases: number };
}

interface ListingDetail extends Listing {
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: { id: string; displayName: string; avatarUrl: string | null };
  }>;
}

const CATEGORIES = [
  { key: "all", label: "Все", icon: MoreHorizontal },
  { key: "stickers", label: "Стикеры", icon: Tag },
  { key: "templates", label: "Шаблоны", icon: Package },
  { key: "courses", label: "Курсы", icon: BookOpen },
  { key: "bots", label: "Боты", icon: Bot },
  { key: "apps", label: "Приложения", icon: ShoppingCart },
  { key: "other", label: "Прочее", icon: MoreHorizontal },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Новинки" },
  { key: "rating", label: "По рейтингу" },
  { key: "downloads", label: "По популярности" },
  { key: "price_asc", label: "Дешевле" },
  { key: "price_desc", label: "Дороже" },
  { key: "name", label: "По имени" },
];

const TYPE_LABELS: Record<string, string> = {
  sticker_pack: "Стикеры",
  template: "Шаблон",
  course: "Курс",
  bot: "Бот",
  mini_app: "Приложение",
  digital_good: "Товар",
};

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

function formatPrice(price: number) {
  if (price === 0) return "Бесплатно";
  return `${(price / 100).toFixed(2)} NC`;
}

export default function MarketplacePage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("newest");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedListing, setSelectedListing] = React.useState<ListingDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Create listing form
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newType, setNewType] = React.useState("digital_good");
  const [newTitle, setNewTitle] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newPrice, setNewPrice] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("");
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Review state
  const [myRating, setMyRating] = React.useState(0);
  const [myComment, setMyComment] = React.useState("");
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [purchasing, setPurchasing] = React.useState(false);

  const loadListings = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sortBy });
      if (activeCategory !== "all") {
        params.set("type", activeCategory);
      }

      const res = await fetch(`/api/marketplace?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings ?? []);
      }
    } catch {
      toast.error("Не удалось загрузить marketplace");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, sortBy]);

  React.useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const loadListingDetail = React.useCallback(async (listingId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/marketplace/${listingId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedListing(data.listing);
      }
    } catch {
      toast.error("Не удалось загрузить-details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleListingClick = React.useCallback(
    (listing: Listing) => {
      void loadListingDetail(listing.id);
    },
    [loadListingDetail],
  );

  const handleCreateListing = React.useCallback(async () => {
    if (!newTitle.trim() || !newDescription.trim() || !newCategory.trim()) {
      toast.error("Заполните обязательные поля");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          title: newTitle.trim(),
          description: newDescription.trim(),
          price: Math.round(parseFloat(newPrice || "0") * 100),
          category: newCategory.trim(),
          imageUrl: newImageUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Объявление создано");
        setShowCreateForm(false);
        setNewTitle("");
        setNewDescription("");
        setNewPrice("");
        setNewCategory("");
        setNewImageUrl("");
        void loadListings();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Не удалось создать");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setCreating(false);
    }
  }, [newType, newTitle, newDescription, newPrice, newCategory, newImageUrl, loadListings]);

  const handlePurchase = React.useCallback(
    async (listingId: string) => {
      setPurchasing(true);
      try {
        const res = await fetch(`/api/marketplace/${listingId}/purchase`, {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          toast.success("Покупка успешна!");
          void loadListingDetail(listingId);
        } else {
          const err = await res.json();
          toast.error(err.error ?? "Не удалось купить");
        }
      } catch {
        toast.error("Ошибка сети");
      } finally {
        setPurchasing(false);
      }
    },
    [loadListingDetail],
  );

  const handleSubmitReview = React.useCallback(async () => {
    if (!selectedListing || myRating < 1) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/marketplace/${selectedListing.id}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: myRating, comment: myComment.trim() || undefined }),
      });
      if (res.ok) {
        toast.success("Отзыв отправлен");
        setMyRating(0);
        setMyComment("");
        void loadListingDetail(selectedListing.id);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Не удалось отправить отзыв");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSubmittingReview(false);
    }
  }, [selectedListing, myRating, myComment, loadListingDetail]);

  const filteredListings = React.useMemo(() => {
    if (!searchQuery.trim()) return listings;
    const q = searchQuery.toLowerCase();
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q),
    );
  }, [listings, searchQuery]);

  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-sm">Загрузка...</div>
      </div>
    );
  }

  // Detail view
  if (selectedListing) {
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
              onClick={() => setSelectedListing(null)}
              className="text-sm text-primary hover:underline"
            >
              ← Назад к маркету
            </button>

            {selectedListing.imageUrl && (
              <img
                src={selectedListing.imageUrl}
                alt={selectedListing.title}
                className="w-full h-48 object-cover rounded-xl border border-border"
              />
            )}

            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold">{selectedListing.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {TYPE_LABELS[selectedListing.type] ?? selectedListing.type} · {selectedListing.category}
                  </p>
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary whitespace-nowrap">
                  {formatPrice(selectedListing.price)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {selectedListing.rating.toFixed(1)} ({selectedListing._count.reviews})
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {selectedListing.downloads.toLocaleString()} загрузок
                </span>
                <span className="text-xs">
                  от {selectedListing.seller.displayName}
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedListing.description}
            </p>

            <button
              type="button"
              onClick={() => handlePurchase(selectedListing.id)}
              disabled={purchasing || selectedListing.sellerId === user?.id}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {purchasing
                ? "Покупка..."
                : selectedListing.sellerId === user?.id
                  ? "Это ваш товар"
                  : `Купить за ${formatPrice(selectedListing.price)}`}
            </button>

            {/* Reviews */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Отзывы</h2>

              {user && selectedListing.sellerId !== user.id && (
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

              <div className="space-y-3">
                {selectedListing.reviews.map((review) => (
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
                {selectedListing.reviews.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Пока нет отзывов
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Catalog view
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Маркет</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Создать объявление
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Новое объявление</h3>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Тип *</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Цена (NC) *</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0 = бесплатно"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название товара"
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Описание *</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Описание товара..."
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm resize-none"
                rows={4}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Категория *</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Например: стикеры, шаблоны"
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">URL изображения</label>
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateListing}
                disabled={creating || !newTitle.trim() || !newDescription.trim() || !newCategory.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creating ? "Создание..." : "Создать"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск в маркете..."
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

        {/* Listings grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ShoppingCart className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">Товаров не найдено</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => handleListingClick(listing)}
                className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-accent/50"
              >
                <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                  {listing.imageUrl ? (
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{listing.title}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {TYPE_LABELS[listing.type] ?? listing.type}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      {formatPrice(listing.price)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {listing.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {listing.downloads.toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
