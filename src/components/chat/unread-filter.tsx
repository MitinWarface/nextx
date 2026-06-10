"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface UnreadFilterProps {
  unreadCount: number;
  isActive: boolean;
  onToggle: () => void;
}

export function UnreadFilter({
  unreadCount,
  isActive,
  onToggle,
}: UnreadFilterProps) {
  return (
    <div className="flex items-center border-b border-sidebar-border px-2 py-1">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary folder-tab-active"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Mail className="h-3 w-3" />
        Непрочитанные
        {unreadCount > 0 && (
          <Badge variant="primary" className="ml-0.5 h-4 min-w-[16px] justify-center px-1 text-[9px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </button>
    </div>
  );
}
