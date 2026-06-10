"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GifItem {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
}

interface GifPanelProps {
  open: boolean;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export function GifPanel({ open, onSelect, onClose }: GifPanelProps) {
  const [query, setQuery] = React.useState("");
  const [gifs, setGifs] = React.useState<GifItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Load trending or search
  const fetchGifs = React.useCallback(async (q: string, off: number, append: boolean) => {
    setLoading(true);
    try {
      const url = q
        ? `/api/gifs?q=${encodeURIComponent(q)}&limit=20&offset=${off}`
        : `/api/gifs?limit=20&offset=${off}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setGifs((prev) => (append ? [...prev, ...data.gifs] : data.gifs));
        setHasMore(data.gifs.length >= 20);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on mount
  React.useEffect(() => {
    if (open && gifs.length === 0) {
      fetchGifs("", 0, false);
    }
  }, [open, gifs.length, fetchGifs]);

  // Focus search input
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Search with debounce
  const handleSearch = React.useCallback(
    (value: string) => {
      setQuery(value);
      setOffset(0);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchGifs(value, 0, false);
      }, 300);
    },
    [fetchGifs],
  );

  // Infinite scroll
  const handleScroll = React.useCallback(() => {
    const el = gridRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      const nextOffset = offset + 20;
      setOffset(nextOffset);
      fetchGifs(query, nextOffset, true);
    }
  }, [loading, hasMore, offset, query, fetchGifs]);

  // Cleanup debounce
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="mb-2 rounded-xl border border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Поиск GIF..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        onScroll={handleScroll}
        className="grid max-h-[320px] grid-cols-3 gap-1 overflow-y-auto p-1 sm:grid-cols-4"
      >
        {gifs.map((gif) => (
          <button
            key={gif.id}
            type="button"
            onClick={() => onSelect(gif.url)}
            className="group relative overflow-hidden rounded-md bg-muted"
            style={{ aspectRatio: `${gif.previewWidth}/${gif.previewHeight}` }}
            title={gif.title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gif.previewUrl}
              alt={gif.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
          </button>
        ))}

        {loading && gifs.length === 0 && (
          <div className="col-span-full flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && gifs.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            {query ? "Ничего не найдено" : "Загрузка GIF..."}
          </div>
        )}
      </div>
    </div>
  );
}
