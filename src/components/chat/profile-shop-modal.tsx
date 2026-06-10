"use client";

import * as React from "react";
import { X, Crown, Star, Sparkles, Palette, Image, Music, Volume2 } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface ProfileShopModalProps {
  open: boolean;
  onClose: () => void;
}

type ShopTab = "frames" | "backgrounds" | "badges" | "stickers" | "effects" | "sounds";

const FRAMES = [
  { id: "none", name: "Без рамки", icon: "—", price: 0 },
  { id: "gold", name: "Золотая", icon: "🥇", price: 199 },
  { id: "diamond", name: "Бриллиантовая", icon: "💎", price: 499 },
  { id: "neon", name: "Неоновая", icon: "✨", price: 299 },
  { id: "fire", name: "Огненная", icon: "🔥", price: 399 },
  { id: "galaxy", name: "Галактика", icon: "🌌", price: 599 },
];

const BACKGROUNDS = [
  { id: "default", name: "Стандарт", color: "bg-background" },
  { id: "sunset", name: "Закат", color: "bg-gradient-to-br from-orange-400 to-pink-500" },
  { id: "ocean", name: "Океан", color: "bg-gradient-to-br from-blue-400 to-cyan-500" },
  { id: "forest", name: "Лес", color: "bg-gradient-to-br from-green-400 to-emerald-500" },
  { id: "night", name: "Ночь", color: "bg-gradient-to-br from-indigo-500 to-purple-600" },
  { id: "aurora", name: "Аврора", color: "bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500" },
];

const BADGES = [
  { id: "none", name: "Без бейджа", icon: "—", price: 0 },
  { id: "verified", name: "Верифицированный", icon: "✅", price: 99 },
  { id: "premium", name: "Premium", icon: "👑", price: 0, requiresPremium: true },
  { id: "bot", name: "Бот", icon: "🤖", price: 0 },
  { id: "artist", name: "Артист", icon: "🎨", price: 199 },
  { id: "moderator", name: "Модератор", icon: "🛡️", price: 0 },
];

const STICKERS = [
  { id: "cat_love", name: "Котик-любовь", icon: "🐱", price: 50, description: "Анимированный котик" },
  { id: "fire_dance", name: "Танцующий огонь", icon: "🔥", price: 75, description: "Огненная анимация" },
  { id: "star_rain", name: "Звёздный дождь", icon: "⭐", price: 100, description: "Падающие звёзды" },
  { id: "neon_pulse", name: "Неоновый пульс", icon: "💫", price: 150, description: "Неоновые эффекты" },
  { id: "galaxy_swirl", name: "Галактический вихрь", icon: "🌀", price: 200, description: "Космический эффект" },
  { id: "rainbow_spark", name: "Радужная искра", icon: "🌈", price: 120, description: "Радужные искры" },
];

const EFFECTS = [
  { id: "none", name: "Без эффекта", icon: "—", price: 0 },
  { id: "glow", name: "Свечение", icon: "✨", price: 150, description: "Мягкое свечение аватара" },
  { id: "particles", name: "Частицы", icon: "🌟", price: 200, description: "Летающие частицы" },
  { id: "blur", name: "Блюр фон", icon: "🔮", price: 100, description: "Размытие фона профиля" },
  { id: "shimmer", name: "Мерцание", icon: "💫", price: 175, description: "Мерцающий эффект" },
  { id: "float", name: "Парящий", icon: "🎈", price: 250, description: "Парящий аватар" },
];

const SOUNDS = [
  { id: "none", name: "Без звука", icon: "🔇", price: 0 },
  { id: "click", name: "Клик", icon: "🖱️", price: 25, description: "Звук клика" },
  { id: "whoosh", name: "Ктош", icon: "💨", price: 50, description: "Звук появления" },
  { id: "ding", name: "Динг", icon: "🔔", price: 75, description: "Звук уведомления" },
  { id: "pop", name: "Поп", icon: "🎈", price: 40, description: "Звук сообщения" },
  { id: "sparkle", name: "Блёстки", icon: "✨", price: 100, description: "Звук блёсток" },
];

const ALL_TABS: { id: ShopTab; label: string; icon: React.ReactNode }[] = [
  { id: "frames", label: "Рамки", icon: <Crown className="inline h-3.5 w-3.5" /> },
  { id: "backgrounds", label: "Фоны", icon: <Palette className="inline h-3.5 w-3.5" /> },
  { id: "badges", label: "Бейджи", icon: <Star className="inline h-3.5 w-3.5" /> },
  { id: "stickers", label: "Стикеры", icon: <Image className="inline h-3.5 w-3.5" /> },
  { id: "effects", label: "Эффекты", icon: <Sparkles className="inline h-3.5 w-3.5" /> },
  { id: "sounds", label: "Звуки", icon: <Volume2 className="inline h-3.5 w-3.5" /> },
];

export function ProfileShopModal({ open, onClose }: ProfileShopModalProps) {
  const [tab, setTab] = React.useState<ShopTab>("frames");
  const [selectedFrame, setSelectedFrame] = React.useState("none");
  const [selectedBg, setSelectedBg] = React.useState("default");
  const [selectedBadge, setSelectedBadge] = React.useState("none");
  const [selectedSticker, setSelectedSticker] = React.useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = React.useState("none");
  const [selectedSound, setSelectedSound] = React.useState("none");
  const [owned, setOwned] = React.useState<Set<string>>(new Set(["none", "default"]));
  const [equipped, setEquipped] = React.useState<Record<string, string>>({});

  const purchase = async (category: string, itemId: string, price: number) => {
    if (price === 0 && itemId !== "none" && itemId !== "default") {
      toast.info("Это уже доступно бесплатно");
      return;
    }
    if (owned.has(itemId)) {
      // Equip instead of purchase
      setEquipped((prev) => ({ ...prev, [category]: itemId }));
      toast.success("Экипировано!");
      return;
    }
    try {
      const res = await fetch("/api/users/me/shop", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, itemId, price }),
      });
      if (res.ok) {
        setOwned((prev) => new Set(prev).add(itemId));
        setEquipped((prev) => ({ ...prev, [category]: itemId }));
        toast.success("Приобретено!");
      } else {
        const data = await res.json();
        toast.error(data.error === "insufficient_funds" ? "Недостаточно NC" : "Ошибка");
      }
    } catch {
      toast.error("Ошибка");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Магазин профиля</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="flex overflow-x-auto border-b border-border scrollbar-none">
          {ALL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1 whitespace-nowrap px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}
            >
              {t.icon}
              <span className="ml-1">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* My Collection section */}
          {owned.size > 2 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Моя коллекция</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from(owned)
                  .filter((id) => id !== "none" && id !== "default")
                  .map((id) => {
                    const item =
                      FRAMES.find((f) => f.id === id) ??
                      BACKGROUNDS.find((b) => b.id === id) ??
                      BADGES.find((b) => b.id === id) ??
                      STICKERS.find((s) => s.id === id) ??
                      EFFECTS.find((e) => e.id === id) ??
                      SOUNDS.find((s) => s.id === id);
                    if (!item) return null;
                    return (
                      <div key={id} className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 p-2">
                        <span className="text-xl">{"icon" in item ? item.icon : "🎨"}</span>
                        <span className="text-[10px] text-muted-foreground">{item.name}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tab content */}
          {tab === "frames" && (
            <div className="grid grid-cols-2 gap-3">
              {FRAMES.map((f) => {
                const isOwned = owned.has(f.id);
                const isEquipped = equipped.frame === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => purchase("frame", f.id, f.price)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border p-4 transition-colors",
                      isEquipped ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                    )}
                  >
                    <span className="text-3xl">{f.icon}</span>
                    <span className="mt-2 text-sm font-medium">{f.name}</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {f.price === 0 ? "Бесплатно" : isOwned ? "Экипировать" : `${f.price} NC`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "backgrounds" && (
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUNDS.map((bg) => {
                const isEquipped = equipped.background === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => purchase("background", bg.id, 0)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border p-4 transition-colors",
                      isEquipped ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                    )}
                  >
                    <div className={cn("h-12 w-full rounded-md", bg.color)} />
                    <span className="mt-2 text-sm font-medium">{bg.name}</span>
                    {isEquipped && <span className="mt-1 text-[10px] text-primary">Активен</span>}
                  </button>
                );
              })}
            </div>
          )}

          {tab === "badges" && (
            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((b) => {
                const isOwned = owned.has(b.id);
                const isEquipped = equipped.badge === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => purchase("badge", b.id, b.price)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border p-4 transition-colors",
                      isEquipped ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                    )}
                  >
                    <span className="text-3xl">{b.icon}</span>
                    <span className="mt-2 text-sm font-medium">{b.name}</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {b.requiresPremium ? "Premium" : b.price === 0 ? "Бесплатно" : isOwned ? "Экипировать" : `${b.price} NC`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "stickers" && (
            <div className="grid grid-cols-2 gap-3">
              {STICKERS.map((s) => {
                const isOwned = owned.has(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => purchase("sticker", s.id, s.price)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border p-4 transition-colors",
                      selectedSticker === s.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                    )}
                  >
                    <span className="text-3xl">{s.icon}</span>
                    <span className="mt-2 text-sm font-medium">{s.name}</span>
                    <span className="mt-1 text-[10px] text-muted-foreground">{s.description}</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {isOwned ? "Куплено" : `${s.price} NC`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "effects" && (
            <div className="grid grid-cols-2 gap-3">
              {EFFECTS.map((e) => {
                const isOwned = owned.has(e.id);
                const isEquipped = equipped.effect === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => purchase("effect", e.id, e.price)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border p-4 transition-colors",
                      isEquipped ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                    )}
                  >
                    <span className="text-3xl">{e.icon}</span>
                    <span className="mt-2 text-sm font-medium">{e.name}</span>
                    {e.description && <span className="mt-1 text-[10px] text-muted-foreground">{e.description}</span>}
                    <span className="mt-1 text-xs text-muted-foreground">
                      {e.price === 0 ? "Бесплатно" : isOwned ? "Экипировать" : `${e.price} NC`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "sounds" && (
            <div className="grid grid-cols-2 gap-3">
              {SOUNDS.map((s) => {
                const isOwned = owned.has(s.id);
                const isEquipped = equipped.sound === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => purchase("sound", s.id, s.price)}
                    className={cn(
                      "flex flex-col items-center rounded-lg border p-4 transition-colors",
                      isEquipped ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                    )}
                  >
                    <span className="text-3xl">{s.icon}</span>
                    <span className="mt-2 text-sm font-medium">{s.name}</span>
                    {s.description && <span className="mt-1 text-[10px] text-muted-foreground">{s.description}</span>}
                    <span className="mt-1 text-xs text-muted-foreground">
                      {s.price === 0 ? "Бесплатно" : isOwned ? "Экипировать" : `${s.price} NC`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
