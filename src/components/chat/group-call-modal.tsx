"use client";

import * as React from "react";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, Monitor,
} from "lucide-react";
import { useLivekitCall, type LivekitCallKind } from "@/hooks/use-livekit-call";
import { LivekitRoomGrid } from "./livekit-video";
import { formatCallDuration } from "@/hooks/use-call";
import { cn } from "@/lib/utils";

interface GroupCallModalProps {
  chatId: string;
  chatName: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  kind: LivekitCallKind;
  onClose: () => void;
}

export function GroupCallModal({
  chatId,
  chatName,
  participantIds,
  participantNames,
  kind,
  onClose,
}: GroupCallModalProps) {
  const lk = useLivekitCall();
  const [elapsed, setElapsed] = React.useState(0);
  const startRef = React.useRef<number>(Date.now());

  // Auto-join LiveKit room
  React.useEffect(() => {
    if (lk.state === "IDLE") {
      const roomName = `group-${chatId}-${Date.now()}`;
      void lk.joinRoom(roomName, kind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-close on end
  React.useEffect(() => {
    if (lk.state === "ENDED") {
      onClose();
    }
  }, [lk.state, onClose]);

  // Elapsed timer
  React.useEffect(() => {
    if (lk.state === "CONNECTED") {
      const iv = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
      return () => clearInterval(iv);
    }
  }, [lk.state]);

  const isVideo = kind === "VIDEO";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
      {/* LiveKit room grid */}
      {lk.room && (
        <div className="absolute inset-0">
          <LivekitRoomGrid room={lk.room} localName="Вы" />
        </div>
      )}

      {/* Waiting state */}
      {lk.state !== "CONNECTED" && (
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
            <Users className="h-10 w-10 text-white/60" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold">{chatName}</h2>
            <p className="mt-1 text-sm text-white/70">
              {lk.state === "JOINING" && "Подключение к SFU…"}
              {lk.state === "ENDED" && "Звонок завершён"}
              {lk.state === "IDLE" && (lk.error ?? "")}
            </p>
          </div>
        </div>
      )}

      {/* Connected info */}
      {lk.state === "CONNECTED" && (
        <div className="absolute left-4 top-4 flex items-center gap-2 text-sm text-white/70">
          <Users className="h-4 w-4" />
          <span>Групповой звонок · {chatName} · {formatCallDuration(elapsed)}</span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4">
        <button
          type="button"
          onClick={() => lk.toggleMute()}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
            lk.isMuted ? "bg-red-500/80" : "bg-white/15",
          )}
          aria-label={lk.isMuted ? "Включить микрофон" : "Выключить микрофон"}
        >
          {lk.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {isVideo && (
          <button
            type="button"
            onClick={() => lk.toggleCamera()}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
              lk.isCameraOff ? "bg-red-500/80" : "bg-white/15",
            )}
            aria-label={lk.isCameraOff ? "Включить камеру" : "Выключить камеру"}
          >
            {lk.isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            if (isVideo) await lk.toggleScreenShare();
          }}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
            lk.isScreenSharing ? "bg-emerald-500/80" : "bg-white/15",
          )}
          aria-label="Демонстрация экрана"
        >
          <Monitor className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => { lk.leaveRoom(); onClose(); }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-xl transition-transform hover:scale-105"
          aria-label="Покинуть звонок"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>

      {/* Error */}
      {lk.error && (
        <p className="absolute bottom-32 text-sm text-red-300">{lk.error}</p>
      )}
    </div>
  );
}
