"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";

interface AlbumMessage {
  id: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  content?: string | null;
  type: string;
}

export function MediaAlbum({
  messages,
  isOutgoing,
}: {
  messages: AlbumMessage[];
  isOutgoing: boolean;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const count = messages.length;
  const first = messages[0];
  const caption = first?.content;

  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const gridClass =
    count === 1
      ? "grid-cols-1"
      : count === 2
        ? "grid-cols-2"
        : count === 3
          ? "grid-cols-2"
          : "grid-cols-2";

  return (
    <>
      <div className={`grid ${gridClass} gap-0.5 overflow-hidden rounded-xl`}>
        {messages.slice(0, 4).map((msg, idx) => (
          <div
            key={msg.id}
            className={`relative cursor-pointer overflow-hidden bg-muted ${
              count === 3 && idx === 0 ? "row-span-2" : ""
            } ${count === 1 ? "max-h-80" : "aspect-square"}`}
            onClick={() => openViewer(idx)}
          >
            <img
              src={msg.thumbnailUrl || msg.mediaUrl || ""}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {count > 4 && idx === 3 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xl font-bold text-white">
                +{count - 4}
              </div>
            )}
          </div>
        ))}
      </div>
      {caption && (
        <div className="mt-1 px-1 text-sm">{caption}</div>
      )}

      {viewerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setViewerOpen(false)}
        >
          <button
            className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setViewerOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            className="absolute right-4 top-16 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              const url = messages[viewerIndex]?.mediaUrl;
              if (url) {
                const a = document.createElement("a");
                a.href = url;
                a.download = "";
                a.click();
              }
            }}
          >
            <Download className="h-5 w-5" />
          </button>
          <img
            src={messages[viewerIndex]?.mediaUrl || ""}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {count > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {messages.map((msg, idx) => (
                <button
                  key={msg.id}
                  className={`h-2 w-2 rounded-full ${
                    idx === viewerIndex ? "bg-white" : "bg-white/40"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerIndex(idx);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
