"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FREE_REACTION_EMOJI } from "@/lib/emoji-sets";

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Частые": ["👍", "❤️", "😂", "🔥", "😢", "🎉", "🙏", "👏", "💯", "✅", "😍", "🤔", "😊", "💪", "🚀", "⭐"],
  "Смайлики": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒"],
  "Жесты": ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "💪", "🦾"],
  "Животные": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞"],
  "Еда": ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🥦", "🥬", "🌶️", "🫑", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩"],
  "Объекты": ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "💾", "💿", "📀", "📼", "📷", "📹", "🎥", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏰", "💡", "🔦", "🕯️", "💰", "💵", "💴", "💶", "💷", "🪙", "💳", "💎", "⚖️", "🧰"],
  "Символы": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⭐", "🌟", "💫", "✨", "🔥", "💥", "❄️", "🌈", "☀️", "🌙", "⚡", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️"],
};

const FREE_CATEGORIES: Record<string, string[]> = {
  "Частые": EMOJI_CATEGORIES["Частые"],
};

export function EmojiPicker({
  open,
  onSelect,
  onClose,
  className,
  isPremium = true,
}: {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
  isPremium?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("Частые");

  const categories = isPremium
    ? Object.keys(EMOJI_CATEGORIES)
    : Object.keys(FREE_CATEGORIES);

  const source = isPremium ? EMOJI_CATEGORIES : FREE_CATEGORIES;

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setActiveCategory("Частые");
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const filteredEmojis = search
    ? Object.values(source).flat().filter((e: string) => e.includes(search) || e.toLowerCase().includes(search.toLowerCase()))
    : source[activeCategory] ?? [];

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        "absolute z-30 bottom-full mb-1 w-[280px] rounded-lg border border-border bg-card shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        className,
      )}
    >
      {!isPremium && (
        <div className="border-b border-border px-2 py-1 text-[10px] text-muted-foreground">
          🔒 Полный набор — в <span className="font-medium text-primary">Premium</span>
        </div>
      )}
      <div className="border-b border-border p-2">
        <input
          type="text"
          placeholder="Поиск эмодзи..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none"
          autoFocus
        />
      </div>
      {!search && categories.length > 1 && (
        <div
          className="flex gap-0.5 border-b border-border px-1 py-1 overflow-x-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap rounded px-2 py-1 text-xs transition-colors",
                activeCategory === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      <div
        className="grid max-h-[200px] grid-cols-8 gap-0.5 overflow-y-auto p-1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {filteredEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => onSelect(emoji)}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-lg transition-transform hover:scale-125 hover:bg-accent"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
