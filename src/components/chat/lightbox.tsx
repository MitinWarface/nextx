"use client";

import * as React from "react";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxImage {
  url: string;
  fileName?: string;
  caption?: string;
}

export function Lightbox({
  images,
  startIndex = 0,
  onClose,
}: {
  images: LightboxImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = React.useState(
    Math.max(0, Math.min(startIndex, images.length - 1)),
  );

  const goPrev = React.useCallback(() => {
    setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = React.useCallback(() => {
    setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && images.length > 1) goPrev();
      else if (e.key === "ArrowRight" && images.length > 1) goNext();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext, images.length]);

  if (images.length === 0) return null;
  const current = images[index];
  const hasMany = images.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
    >
      <div
        className="absolute right-3 top-3 z-10 flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={current.url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
          aria-label="Скачать"
        >
          <Download className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {hasMany && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Предыдущее изображение"
            className="absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-secondary/80 text-secondary-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Следующее изображение"
            className="absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-secondary/80 text-secondary-foreground transition-colors hover:bg-secondary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <img
        key={current.url}
        src={current.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />

      {hasMany && (
        <div
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
