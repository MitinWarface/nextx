export interface AchievementDef {
  code: string;
  name: string;
  description: string;
  icon: string;
  category: "social" | "messaging" | "premium" | "special";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_message", name: "Первое сообщение", description: "Отправили первое сообщение", icon: "💬", category: "messaging" },
  { code: "100_messages", name: "Активный болтун", description: "Отправлено 100 сообщений", icon: "🗣️", category: "messaging" },
  { code: "1000_messages", name: "Мастер слов", description: "Отправлено 1000 сообщений", icon: "📚", category: "messaging" },
  { code: "first_group", name: "Организатор", description: "Создали первую группу", icon: "👥", category: "social" },
  { code: "10_groups", name: "Лидер сообщества", description: "Создали 10 групп", icon: "🏆", category: "social" },
  { code: "first_channel", name: "Блогер", description: "Создали первый канал", icon: "📢", category: "social" },
  { code: "premium_1month", name: "Premium старт", description: "Подписка Premium на 1 месяц", icon: "⭐", category: "premium" },
  { code: "premium_6months", name: "Premium фанат", description: "Premium 6 месяцев", icon: "🌟", category: "premium" },
  { code: "early_adopter", name: "Ранний пользователь", description: "Зарегистрированы до 2027", icon: "🌅", category: "special" },
  { code: "verified", name: "Верифицирован", description: "Получили верификацию", icon: "✅", category: "special" },
  { code: "gift_master", name: "Щедрый друг", description: "Отправили 10 подарков", icon: "🎁", category: "social" },
  { code: "first_wallet", name: "Первый NC", description: "Пополнили кошелёк впервые", icon: "💰", category: "special" },
];

export function getAchievementByCode(code: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.code === code);
}
