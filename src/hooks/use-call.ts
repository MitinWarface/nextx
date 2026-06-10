"use client";

import * as React from "react";
import { useSocket } from "./use-socket";
import { useAuthStore } from "@/store/auth-store";
import { useCallStore } from "@/store/call-store";

export type CallKind = "AUDIO" | "VIDEO";
export type CallState = "IDLE" | "OUTGOING" | "INCOMING" | "CONNECTED" | "ENDED";

export interface CallParticipant {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ActiveCall {
  callId: string;
  kind: CallKind;
  remote: CallParticipant;
  isOutgoing: boolean;
  pc: RTCPeerConnection;
  localStream: MediaStream;
  remoteStream: MediaStream;
  startedAt: number;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Free TURN relay fallback (OpenRelay project — rate-limited, for dev only)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

// Synthesize ringtone via Web Audio API (no file needed)
let ringtoneCtx: AudioContext | null = null;
let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function startRingtone() {
  try {
    if (ringtoneCtx) return;
    ringtoneCtx = new AudioContext();
    const ctx = ringtoneCtx;
    function playBeep() {
      if (!ctx || ctx.state === "closed") return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
    playBeep();
    ringtoneInterval = setInterval(playBeep, 2000);
  } catch { /* noop */ }
}

function stopRingtone() {
  try {
    if (ringtoneInterval) {
      clearInterval(ringtoneInterval);
      ringtoneInterval = null;
    }
    ringtoneCtx?.close().catch(() => undefined);
    ringtoneCtx = null;
  } catch { /* noop */ }
}

export interface UseCallResult {
  active: ActiveCall | null;
  incoming: { callId: string; from: CallParticipant; kind: CallKind; sdp: RTCSessionDescriptionInit } | null;
  state: CallState;
  error: string | null;
  startCall: (remote: CallParticipant, kind: CallKind) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  hangup: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  duration: number;
}

export function useCall(): UseCallResult {
  const { socket } = useSocket();
  const myUser = useAuthStore((s) => s.user);
  const [active, setActive] = React.useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = React.useState<UseCallResult["incoming"]>(null);
  const [state, setState] = React.useState<CallState>("IDLE");
  const [error, setError] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCameraOff, setIsCameraOff] = React.useState(false);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const durationRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRef = React.useRef<ActiveCall | null>(null);
  activeRef.current = active;

  const toggleScreenShareRef = React.useRef<() => Promise<void>>(async () => {});

  // ---------- listeners ----------
  React.useEffect(() => {
    if (!socket) return;
    const onOffer = (p: { callId: string; from: CallParticipant; sdp: RTCSessionDescriptionInit; kind: CallKind }) => {
      setIncoming(p);
      setState("INCOMING");
      startRingtone();
    };
    const onAnswer = (p: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      const a = activeRef.current;
      if (!a || a.callId !== p.callId) return;
      void a.pc.setRemoteDescription(p.sdp).catch(() => undefined);
      setState("CONNECTED");
    };
    const onIce = (p: { callId: string; candidate: RTCIceCandidateInit }) => {
      const a = activeRef.current;
      if (!a || a.callId !== p.callId) return;
      void a.pc.addIceCandidate(p.candidate).catch(() => undefined);
    };
    const onHangup = (p: { callId: string }) => {
      const a = activeRef.current;
      if (a && a.callId === p.callId) {
        cleanup(a);
        setActive(null);
        setState("ENDED");
        useCallStore.getState().setOutgoingRemote(null);
        setTimeout(() => setState("IDLE"), 1500);
      }
      setIncoming((cur) => (cur && cur.callId === p.callId ? null : cur));
    };
    const onDecline = (p: { callId: string }) => {
      const a = activeRef.current;
      if (a && a.callId === p.callId) {
        cleanup(a);
        setActive(null);
        setState("ENDED");
        setError("Собеседник отклонил звонок");
        // Clear outgoing remote to prevent stale state
        useCallStore.getState().setOutgoingRemote(null);
        setTimeout(() => {
          setState("IDLE");
          setError(null);
        }, 2000);
      }
    };
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:hangup", onHangup);
    socket.on("call:decline", onDecline);
    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:hangup", onHangup);
      socket.off("call:decline", onDecline);
    };
  }, [socket]);

  // duration counter
  React.useEffect(() => {
    if (state === "CONNECTED") {
      durationRef.current = setInterval(() => {
        const a = activeRef.current;
        if (a) setDuration(Math.floor((Date.now() - a.startedAt) / 1000));
      }, 1000);
    }
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [state]);

  function cleanup(c: ActiveCall) {
    c.localStream.getTracks().forEach((t) => t.stop());
    c.pc.getSenders().forEach((s) => {
      try { s.track?.stop(); } catch { /* noop */ }
    });
    try { c.pc.close(); } catch { /* noop */ }
    setDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    stopRingtone();
  }

  // ---------- actions ----------
  const startCall = React.useCallback(
    async (remote: CallParticipant, kind: CallKind) => {
      if (!socket || !myUser) return;
      setError(null);
      let stream: MediaStream | null = null;
      let pc: RTCPeerConnection | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: kind === "VIDEO",
        });
        pc = new RTCPeerConnection(ICE_SERVERS);
        const remoteStream = new MediaStream();
        stream!.getTracks().forEach((t) => pc!.addTrack(t, stream!));
        pc.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
        };
        const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("call:ice", {
              callId,
              to: remote.id,
              candidate: e.candidate.toJSON(),
            });
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:offer", {
          callId,
          to: remote.id,
          from: {
            id: myUser.id,
            displayName: myUser.displayName,
            avatarUrl: myUser.avatarUrl ?? null,
          },
          sdp: offer,
          kind,
        });
        const newCall: ActiveCall = {
          callId,
          kind,
          remote,
          isOutgoing: true,
          pc,
          localStream: stream,
          remoteStream,
          startedAt: Date.now(),
        };
        setActive(newCall);
        setState("OUTGOING");
      } catch (err) {
        console.error("getUserMedia failed:", err);
        // Clean up leaked resources
        if (pc) try { pc.close(); } catch {}
        if (stream) stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setError("Нет доступа к микрофону/камере");
        setTimeout(() => setError(null), 2500);
      }
    },
    [socket, myUser],
  );

  const acceptCall = React.useCallback(async () => {
    if (!socket || !myUser || !incoming) return;
    setError(null);
    let stream: MediaStream | null = null;
    let pc: RTCPeerConnection | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.kind === "VIDEO",
      });
      pc = new RTCPeerConnection(ICE_SERVERS);
      const remoteStream = new MediaStream();
      stream.getTracks().forEach((t) => pc!.addTrack(t, stream!));
      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("call:ice", {
            callId: incoming.callId,
            to: incoming.from.id,
            candidate: e.candidate.toJSON(),
          });
        }
      };
      await pc.setRemoteDescription(incoming.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", {
        callId: incoming.callId,
        to: incoming.from.id,
        sdp: answer,
      });
      const newCall: ActiveCall = {
        callId: incoming.callId,
        kind: incoming.kind,
        remote: incoming.from,
        isOutgoing: false,
        pc,
        localStream: stream,
        remoteStream,
        startedAt: Date.now(),
      };
      setActive(newCall);
      setIncoming(null);
      setState("CONNECTED");
      stopRingtone();
    } catch (err) {
      console.error("getUserMedia failed:", err);
      // Clean up leaked resources
      if (pc) try { pc.close(); } catch {}
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setError("Нет доступа к микрофону/камере");
      // Decline if can't accept
      socket.emit("call:decline", { callId: incoming.callId, to: incoming.from.id });
      setIncoming(null);
      setState("IDLE");
      stopRingtone();
    }
  }, [socket, myUser, incoming]);

  const declineCall = React.useCallback(() => {
    if (!socket || !incoming) return;
    socket.emit("call:decline", { callId: incoming.callId, to: incoming.from.id });
    setIncoming(null);
    setState("IDLE");
    stopRingtone();
  }, [socket, incoming]);

  const hangup = React.useCallback(() => {
    const a = activeRef.current;
    if (!socket || !a) return;
    socket.emit("call:hangup", { callId: a.callId, to: a.remote.id });
    cleanup(a);
    setActive(null);
    setState("ENDED");
    setTimeout(() => setState("IDLE"), 1000);
  }, [socket]);

  const toggleMute = React.useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    const next = !isMuted;
    a.localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = React.useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    const next = !isCameraOff;
    a.localStream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setIsCameraOff(next);
  }, [isCameraOff]);

  const toggleScreenShare = React.useCallback(async () => {
    const a = activeRef.current;
    if (!a) return;
    if (isScreenSharing) {
      // Остановить шаринг — вернуть камеру
      try {
        // Stop old screen share tracks
        const oldScreenTrack = a.localStream.getVideoTracks().find((t) => t.label.includes("screen") || t.getSettings().displaySurface);
        if (oldScreenTrack) oldScreenTrack.stop();

        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const camTrack = camStream.getVideoTracks()[0];
        if (camTrack) {
          const sender = a.pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(camTrack);
          }
        }
        setIsScreenSharing(false);
        setIsCameraOff(false);
      } catch { /* noop */ }
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;
      // Заменить видео-трек в peer connection
      const sender = a.pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }
      setIsScreenSharing(true);
      setIsCameraOff(false);
      // Когда пользователь нажмёт "Stop sharing" в браузере
      screenTrack.onended = () => {
        void toggleScreenShareRef.current();
      };
    } catch { /* noop */ }
  }, [isScreenSharing]);

  // Keep ref in sync
  React.useEffect(() => {
    toggleScreenShareRef.current = toggleScreenShare;
  }, [toggleScreenShare]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      const a = activeRef.current;
      if (a) {
        cleanup(a);
        setActive(null);
      }
      stopRingtone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    active,
    incoming,
    state,
    error,
    startCall,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    isMuted,
    isCameraOff,
    isScreenSharing,
    duration,
  };
}

export function formatCallDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
