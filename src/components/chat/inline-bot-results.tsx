"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineResult {
  id: string;
  type: string;
  title: string;
  description: string;
  thumbnail_url: string;
  content: string;
}

interface InlineBotResultsProps {
  results: InlineResult[];
  onSelect: (content: string) => void;
  onClose: () => void;
}

export function InlineBotResults({ results, onSelect, onClose }: InlineBotResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-t border-border bg-background px-3 py-2">
      <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-thin">
        {results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => onSelect(result.content)}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:bg-accent/60 min-w-[200px] max-w-[280px]"
          >
            {result.thumbnail_url && (
              <img
                src={result.thumbnail_url}
                alt=""
                className="h-8 w-8 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0 text-left">
              <div className="truncate text-xs font-medium">{result.title}</div>
              <div className="truncate text-[10px] text-muted-foreground">{result.description}</div>
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
