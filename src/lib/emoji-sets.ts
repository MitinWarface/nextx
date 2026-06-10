// Free reaction emojis — 16 most common
export const FREE_REACTION_EMOJI: readonly string[] = [
  "👍", "❤️", "😂", "🔥", "😢", "🎉", "🙏", "👏",
  "💯", "✅", "😍", "🤔", "😊", "💪", "🚀", "⭐",
];

export function isFreeEmoji(emoji: string): boolean {
  return FREE_REACTION_EMOJI.includes(emoji);
}
