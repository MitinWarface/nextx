"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
} as const;

const dotSizes = {
  sm: "h-2 w-2 ring-2",
  md: "h-2.5 w-2.5 ring-2",
  lg: "h-3 w-3 ring-2",
  xl: "h-3.5 w-3.5 ring-2",
} as const;

// Детерминированный цвет по первой букве имени (Telegram Web A палитра)
const colorPalette = [
  "bg-[#FF885E]",
  "bg-[#FFCD6A]",
  "bg-[#C3E580]",
  "bg-[#7BC862]",
  "bg-[#6EC9CB]",
  "bg-[#65AADD]",
  "bg-[#A695E7]",
  "bg-[#EE7AAE]",
  "bg-[#E8A2C8]",
  "bg-[#F28C28]",
];

function getColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return colorPalette[code % colorPalette.length];
}

export function Avatar({ name, src, size = "md", online, className }: AvatarProps) {
  const initials = name.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div className={cn("relative shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover bg-muted",
            sizes[size],
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full font-semibold text-white",
            sizes[size],
            getColor(name),
          )}
          aria-label={name}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-online ring-background",
            dotSizes[size],
          )}
        />
      )}
    </div>
  );
}
