"use client";

import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted-foreground/15",
        className,
      )}
      {...props}
    />
  );
}

export function ChatListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-2.5 w-8" />
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex max-w-[75%] flex-col items-start gap-1">
        <Skeleton className="h-12 w-48 rounded-l-xl rounded-r-md" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
      {icon && <div className="text-4xl opacity-50">{icon}</div>}
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {description && (
        <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
