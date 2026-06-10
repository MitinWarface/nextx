"use client";

import * as React from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCallContext } from "./call-provider";

/**
 * Компактный toast входящего звонка, который появляется на уровне всего приложения.
 * На accept — рендерит полноэкранный CallModal через page.tsx (определяется по state).
 */
export function IncomingCallToast({ onAccept }: { onAccept: () => void }) {
  const call = useCallContext();
  if (!call.incoming) return null;
  const { from, kind } = call.incoming;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/20 bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          {kind === "VIDEO" ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5 animate-pulse" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">
            Входящий {kind === "VIDEO" ? "видео" : ""}звонок
          </p>
          <p className="truncate text-[12px] text-white/70">{from.displayName}</p>
        </div>
        <button
          type="button"
          onClick={() => call.declineCall()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
          aria-label="Отклонить"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600"
          aria-label="Принять"
        >
          <Phone className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
