"use client";

import * as React from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";

const SWIPE_START_THRESHOLD = 8;
const SWIPE_DIRECTION_RATIO = 1.4;
const SWIPE_COMMIT_PX = 70;
const SWIPE_MAX_PX = 120;

interface ArchiveSwipeProps {
  children: React.ReactNode;
  chatId: string;
  isArchived: boolean;
  onArchive: (chatId: string) => void;
}

export function ArchiveSwipe({
  children,
  chatId,
  isArchived,
  onArchive,
}: ArchiveSwipeProps) {
  const [dx, setDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startRef = React.useRef<{
    x: number;
    y: number;
    pointerId: number;
    directionLocked: boolean | null;
  } | null>(null);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return;
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
        directionLocked: null,
      };
    },
    [],
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = startRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      const curDx = e.clientX - start.x;
      const curDy = e.clientY - start.y;
      const absDx = Math.abs(curDx);
      const absDy = Math.abs(curDy);

      if (!dragging) {
        if (absDx < SWIPE_START_THRESHOLD && absDy < SWIPE_START_THRESHOLD) return;
        if (start.directionLocked === null) {
          if (absDx > absDy * SWIPE_DIRECTION_RATIO && curDx < 0) {
            start.directionLocked = true;
            setDragging(true);
          } else if (absDy > absDx * SWIPE_DIRECTION_RATIO) {
            start.directionLocked = false;
            return;
          } else {
            return;
          }
        } else if (start.directionLocked === false) {
          return;
        }
      }

      const clamped = Math.max(0, Math.min(SWIPE_MAX_PX, -curDx));
      setDx(clamped);
    },
    [dragging],
  );

  const commitSwipe = React.useCallback(() => {
    if (dx >= SWIPE_COMMIT_PX) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          (navigator as Navigator & { vibrate: (n: number) => void }).vibrate(15);
        } catch {
          /* ignore */
        }
      }
      onArchive(chatId);
    }
    setDx(0);
    setDragging(false);
    startRef.current = null;
  }, [dx, chatId, onArchive]);

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = startRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      if (dragging) {
        commitSwipe();
      } else {
        startRef.current = null;
      }
    },
    [dragging, commitSwipe],
  );

  const onPointerCancel = React.useCallback(() => {
    setDx(0);
    setDragging(false);
    startRef.current = null;
  }, []);

  const progress = Math.min(1, dx / SWIPE_COMMIT_PX);

  return (
    <div
      className="relative overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-0 flex items-center justify-center w-20 transition-opacity duration-150",
        )}
        style={{ opacity: progress }}
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors",
            isArchived
              ? "bg-emerald-500 text-white"
              : "bg-primary text-primary-foreground",
          )}
          style={{
            transform: `scale(${0.8 + progress * 0.2})`,
          }}
        >
          {isArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </div>
      </div>

      <div
        className="relative z-10 bg-background"
        style={{
          transform: `translateX(${-dx}px)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
