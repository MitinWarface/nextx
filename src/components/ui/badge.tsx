"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  outline: "border border-border bg-transparent text-foreground",
};

export function Badge({
  className,
  variant = "primary",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[13px] font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
