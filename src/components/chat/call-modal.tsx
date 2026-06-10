"use client";

import * as React from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  PhoneIncoming,
  X,
  Monitor,
} from "lucide-react";
import { useCallContext, CallKind, CallParticipant } from "./call-provider";
import { formatCallDuration } from "@/hooks/use-call";
import { cn } from "@/lib/utils";

interface OutgoingCallModalProps {
  remote: CallParticipant;
  kind: CallKind;
  onClose: () => void;
}

export function OutgoingCallModal({ remote, kind, onClose }: OutgoingCallModalProps) {
  const call = useCallContext();
  // Закрыть, когда звонок завершён/отклонён/ошибка
  React.useEffect(() => {
    if (call.state === "IDLE" && !call.active && !call.incoming) {
      onClose();
    }
  }, [call.state, call.active, call.incoming, onClose]);
  return <CallInner remote={remote} onClose={onClose} />;
}

interface IncomingCallModalProps {
  onClose: () => void;
}

export function IncomingCallModal({ onClose }: IncomingCallModalProps) {
  const call = useCallContext();
  React.useEffect(() => {
    if (call.state === "IDLE" && !call.active && !call.incoming) {
      onClose();
    }
  }, [call.state, call.active, call.incoming, onClose]);
  if (!call.incoming) return null;
  return <CallInner remote={call.incoming.from} onClose={onClose} />;
}

function CallInner({
  remote,
  onClose,
}: {
  remote: CallParticipant;
  onClose: () => void;
}) {
  const call = useCallContext();
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (call.active) {
      if (call.active.kind === "VIDEO" && localVideoRef.current) {
        localVideoRef.current.srcObject = call.active.localStream;
      }
      if (call.active.kind === "VIDEO" && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = call.active.remoteStream;
      }
      if (call.active.kind === "AUDIO" && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = call.active.remoteStream;
      }
    }
  }, [call.active]);

  React.useEffect(() => {
    if (call.state === "INCOMING") {
      try { navigator.vibrate?.([400, 200, 400]); } catch { /* noop */ }
    }
  }, [call.state]);

  const isVideo = call.active?.kind === "VIDEO";
  const isConnected = call.state === "CONNECTED";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
      {call.active?.kind === "AUDIO" && (
        <audio ref={remoteAudioRef} autoPlay />
      )}

      {isVideo && call.active && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {isVideo && call.active && (
        <div className="absolute right-4 top-20 z-10 h-32 w-24 overflow-hidden rounded-lg border-2 border-white/20 bg-black shadow-2xl">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="absolute left-4 top-4 flex items-center gap-2 text-sm text-white/70">
        {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
        <span>{isVideo ? "Видеозвонок" : "Голосовой звонок"}</span>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        {(!isVideo || !isConnected) && (
          <div className="relative">
            <div
              className={cn(
                "h-32 w-32 overflow-hidden rounded-full border-4 border-white/20 bg-slate-700",
                call.state === "INCOMING" && "animate-pulse",
              )}
            >
              {remote.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={remote.avatarUrl}
                  alt={remote.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white/80">
                  {remote.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {call.state === "INCOMING" && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Входящий
              </span>
            )}
          </div>
        )}
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{remote.displayName}</h2>
          <p className="mt-1 text-sm text-white/70">
            {call.state === "OUTGOING" && "Вызов…"}
            {call.state === "INCOMING" && "Входящий звонок…"}
            {call.state === "CONNECTED" && formatCallDuration(call.duration)}
            {call.state === "ENDED" && "Звонок завершён"}
            {call.state === "IDLE" && (call.error ?? "Подключение…")}
          </p>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4">
        {call.state === "INCOMING" ? (
          <>
            <button
              type="button"
              onClick={() => call.declineCall()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-xl transition-transform hover:scale-105"
              aria-label="Отклонить"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => void call.acceptCall()}
              className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl transition-transform hover:scale-105"
              aria-label="Принять"
            >
              <PhoneIncoming className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            {call.active && (
              <>
                <button
                  type="button"
                  onClick={() => call.toggleMute()}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
                    call.isMuted ? "bg-red-500/80" : "bg-white/15",
                  )}
                  aria-label={call.isMuted ? "Включить микрофон" : "Выключить микрофон"}
                >
                  {call.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                {isVideo && (
                  <button
                    type="button"
                    onClick={() => call.toggleCamera()}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
                      call.isCameraOff ? "bg-red-500/80" : "bg-white/15",
                    )}
                    aria-label={call.isCameraOff ? "Включить камеру" : "Выключить камеру"}
                  >
                    {call.isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void call.toggleScreenShare()}
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105",
                    call.isScreenSharing ? "bg-emerald-500/80" : "bg-white/15",
                  )}
                  aria-label={call.isScreenSharing ? "Остановить демонстрацию" : "Демонстрация экрана"}
                >
                  <Monitor className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (call.active) call.hangup();
                else onClose();
              }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-xl transition-transform hover:scale-105"
              aria-label="Завершить"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {call.state === "IDLE" && !call.active && !call.incoming && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {call.state === "IDLE" && call.error && (
        <p className="absolute bottom-32 text-sm text-red-300">{call.error}</p>
      )}
    </div>
  );
}
