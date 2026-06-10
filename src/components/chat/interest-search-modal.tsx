"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Search, X, Star, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  interests: string[];
  reputation: number;
}

interface InterestSearchModalProps {
  open: boolean;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

const POPULAR_INTERESTS = [
  "Программирование",
  "Дизайн",
  "Крипта",
  "Игры",
  "Музыка",
  "Спорт",
  "Наука",
  "Бизнес",
];

export function InterestSearchModal({
  open,
  onClose,
  onViewProfile,
}: InterestSearchModalProps) {
  const [query, setQuery] = React.useState("");
  const [selectedInterest, setSelectedInterest] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<UserResult[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setSelectedInterest(null);
      setResults([]);
      setTotal(0);
    }
  }, [open]);

  const search = React.useCallback(async (interest: string) => {
    if (!interest.trim()) return;
    setLoading(true);
    setSelectedInterest(interest.trim());
    try {
      const res = await fetch(
        `/api/users/search-by-interest?interest=${encodeURIComponent(interest.trim())}&limit=20`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.users ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) search(query);
  };

  const handleChipClick = (interest: string) => {
    setQuery(interest);
    search(interest);
  };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[70] flex items-center justify-center transition-opacity duration-200",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Люди по интересам"
        className={cn(
          "relative z-10 flex w-[90vw] max-w-[480px] flex-col rounded-xl bg-background shadow-2xl",
          "max-h-[80vh] overflow-hidden",
          open ? "scale-100" : "scale-95",
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold">Люди по интересам</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-4 pt-3">
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Введите интерес..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

        {/* Popular chips */}
        <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2">
          {POPULAR_INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => handleChipClick(interest)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                selectedInterest === interest
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:bg-accent",
              )}
            >
              {interest}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedInterest && results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Никого не нашли по интересу «{selectedInterest}»
            </p>
          ) : results.length > 0 ? (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                Найдено: {total}
              </p>
              <div className="space-y-1">
                {results.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewProfile?.(user.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent/60"
                  >
                    <Avatar
                      name={user.displayName}
                      src={user.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {user.displayName}
                      </div>
                      {user.username && (
                        <div className="truncate text-xs text-muted-foreground">
                          @{user.username}
                        </div>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {user.interests.slice(0, 3).map((int) => (
                          <span
                            key={int}
                            className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                          >
                            {int}
                          </span>
                        ))}
                        {user.interests.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{user.interests.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-amber-500" />
                      {Math.round(user.reputation)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
