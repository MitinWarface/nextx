/**
 * Community Levels — gamification system for chats.
 * Each chat (group/channel) earns XP through activity and levels up.
 */

export interface CommunityLevel {
  name: string;
  emoji: string;
  unlocks: string;
}

export const COMMUNITY_LEVELS: Record<number, CommunityLevel> = {
  1: { name: "Новичок", emoji: "🌱", unlocks: "Базовые функции" },
  2: { name: "Активный", emoji: "🌿", unlocks: "Кастомные эмодзи" },
  3: { name: "Опытный", emoji: "🌳", unlocks: "Фоны чата" },
  4: { name: "Эксперт", emoji: "🏆", unlocks: "Голосовые эффекты" },
  5: { name: "Легенда", emoji: "👑", unlocks: "Дополнительные роли" },
};

const MAX_LEVEL = 5;

/**
 * Calculate the level for a given XP value.
 * Uses quadratic scaling: each level requires more XP than the previous.
 */
export function getLevelForXP(xp: number): number {
  if (xp <= 0) return 1;

  for (let level = MAX_LEVEL; level >= 1; level--) {
    const threshold = getXPThreshold(level);
    if (xp >= threshold) return level;
  }
  return 1;
}

/**
 * Get the total XP threshold required to reach a specific level.
 * Level 1: 0, Level 2: 100, Level 3: 350, Level 4: 750, Level 5: 1500
 */
export function getXPThreshold(level: number): number {
  switch (level) {
    case 1: return 0;
    case 2: return 100;
    case 3: return 350;
    case 4: return 750;
    case 5: return 1500;
    default: return 0;
  }
}

/**
 * Get the XP needed to progress from current level to the next level.
 */
export function getXPToNextLevel(currentXp: number): number {
  const currentLevel = getLevelForXP(currentXp);
  if (currentLevel >= MAX_LEVEL) return 0;
  const nextThreshold = getXPThreshold(currentLevel + 1);
  return nextThreshold - currentXp;
}

/**
 * XP awarded for sending a message in a group/channel.
 */
export function getXPForMessage(): number {
  return 5;
}

/**
 * XP awarded for organizing/participating in an event.
 */
export function getXPForEvent(): number {
  return 10;
}

/**
 * Get level info including progress to next level.
 */
export function getLevelInfo(xp: number) {
  const level = getLevelForXP(xp);
  const currentThreshold = getXPThreshold(level);
  const nextThreshold = level < MAX_LEVEL ? getXPThreshold(level + 1) : currentThreshold;
  const xpInLevel = xp - currentThreshold;
  const xpForLevel = nextThreshold - currentThreshold;
  const progress = xpForLevel > 0 ? (xpInLevel / xpForLevel) * 100 : 100;

  return {
    level,
    xp,
    currentThreshold,
    nextThreshold: level < MAX_LEVEL ? nextThreshold : null,
    xpInLevel,
    xpForLevel,
    progress: Math.min(progress, 100),
    info: COMMUNITY_LEVELS[level],
    isMaxLevel: level >= MAX_LEVEL,
  };
}
