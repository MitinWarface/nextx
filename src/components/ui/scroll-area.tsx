"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = "vertical", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-y-auto overflow-x-hidden",
        orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
ScrollArea.displayName = "ScrollArea";
