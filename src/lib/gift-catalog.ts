/**
 * Shared gift catalog — single source of truth for gift names, emojis, and prices.
 * Prices are in kopecks (1 NC = 100_000_000 kopecks).
 */
export const GIFT_CATALOG = [
  { name: "Роза", emoji: "🌹", price: 100_000_000, rarity: "common" as const, isLimited: false, totalSupply: null },
  { name: "Торт", emoji: "🎂", price: 200_000_000, rarity: "common" as const, isLimited: false, totalSupply: null },
  { name: "Диамант", emoji: "💎", price: 500_000_000, rarity: "rare" as const, isLimited: false, totalSupply: null },
  { name: "Котик", emoji: "🐱", price: 50_000_000, rarity: "common" as const, isLimited: false, totalSupply: null },
  { name: "Звезда", emoji: "⭐", price: 150_000_000, rarity: "common" as const, isLimited: false, totalSupply: null },
  { name: "Корона", emoji: "👑", price: 1_000_000_000, rarity: "legendary" as const, isLimited: true, totalSupply: 100 },
  { name: "Сердце", emoji: "❤️", price: 75_000_000, rarity: "common" as const, isLimited: false, totalSupply: null },
  { name: "Ракета", emoji: "🚀", price: 300_000_000, rarity: "epic" as const, isLimited: false, totalSupply: null },
  { name: "Тигр", emoji: "🐯", price: 750_000_000, rarity: "epic" as const, isLimited: true, totalSupply: 50 },
  { name: "Феникс", emoji: "🔥", price: 2_000_000_000, rarity: "legendary" as const, isLimited: true, totalSupply: 10 },
  { name: "Панда", emoji: "🐼", price: 400_000_000, rarity: "rare" as const, isLimited: false, totalSupply: null },
  { name: "Дракон", emoji: "🐉", price: 1_500_000_000, rarity: "legendary" as const, isLimited: true, totalSupply: 25 },
] as const;

export type GiftRarity = "common" | "rare" | "epic" | "legendary";

export function formatPrice(priceKopecks: number): string {
  const nc = priceKopecks / 100_000_000;
  return nc % 1 === 0 ? `${nc} NC` : `${nc.toFixed(1)} NC`;
}
