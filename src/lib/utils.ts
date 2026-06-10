import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLastSeen(lastSeen: number): string {
  const diff = Date.now() - lastSeen;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return new Date(lastSeen).toLocaleDateString("ru-RU");
}

export function generateChatId(userA: string, userB: string): string {
  return [userA, userB].sort().join(":");
}

export function truncate(str: string, max = 100): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
