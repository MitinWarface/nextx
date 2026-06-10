"use client";

import * as React from "react";
import {
  Room,
  RoomEvent,
  Track,
  type TrackPublication,
  type Participant,
} from "livekit-client";
import { useAuthStore } from "@/store/auth-store";

export type LivekitCallKind = "AUDIO" | "VIDEO";
export type LivekitCallState = "IDLE" | "JOINING" | "CONNECTED" | "ENDED";

export interface LivekitParticipant {
  id: string;
  displayName: string;
  isMuted: boolean;
  isCameraOff: boolean;
  tracks: Map<string, TrackPublication>;
}

export interface UseLivekitCallResult {
  state: LivekitCallState;
  room: Room | null;
  localTracks: Map<string, TrackPublication>;
  remoteParticipants: Map<string, LivekitParticipant>;
  error: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  joinRoom: (roomName: string, kind: LivekitCallKind) => Promise<void>;
  leaveRoom: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
}

export function useLivekitCall(): UseLivekitCallResult {
  const myUser = useAuthStore((s) => s.user);
  const [state, setState] = React.useState<LivekitCallState>("IDLE");
  const [room, setRoom] = React.useState<Room | null>(null);
  const [localTracks, setLocalTracks] = React.useState<Map<string, TrackPublication>>(new Map());
  const [remoteParticipants, setRemoteParticipants] = React.useState<Map<string, LivekitParticipant>>(new Map());
  const [error, setError] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCameraOff, setIsCameraOff] = React.useState(false);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const roomRef = React.useRef<Room | null>(null);

  const syncLocalTracks = React.useCallback((r: Room) => {
    const local = r.localParticipant;
    if (!local) return;
    const tracks = new Map<string, TrackPublication>();
    local.trackPublications.forEach((pub, key) => {
      tracks.set(key, pub);
    });
    setLocalTracks(new Map(tracks));
  }, []);

  const syncRemoteParticipants = React.useCallback((r: Room) => {
    const map = new Map<string, LivekitParticipant>();
    r.remoteParticipants.forEach((p) => {
      map.set(p.identity, {
        id: p.identity,
        displayName: p.name || p.identity,
        isMuted: !p.isMicrophoneEnabled,
        isCameraOff: !p.isCameraEnabled,
        tracks: p.trackPublications,
      });
    });
    setRemoteParticipants(map);
  }, []);

  const joinRoom = React.useCallback(async (roomName: string, kind: LivekitCallKind) => {
    if (!myUser) return;
    setError(null);
    setState("JOINING");

    try {
      const res = await fetch("/api/livekit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: roomName,
          identity: myUser.id,
          name: myUser.displayName,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get LiveKit token");
      }

      const { token } = await res.json();

      const r = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
        videoCaptureDefaults: { resolution: { width: 1280, height: 720, frameRate: 30 } },
      });

      roomRef.current = r;
      setRoom(r);

      r.on(RoomEvent.Connected, () => {
        setState("CONNECTED");
        syncLocalTracks(r);
      });

      r.on(RoomEvent.Disconnected, () => {
        setState("ENDED");
        setLocalTracks(new Map());
        setRemoteParticipants(new Map());
      });

      r.on(RoomEvent.TrackSubscribed, () => {
        syncRemoteParticipants(r);
      });

      r.on(RoomEvent.TrackUnsubscribed, () => {
        syncRemoteParticipants(r);
      });

      r.on(RoomEvent.ParticipantConnected, () => {
        syncRemoteParticipants(r);
      });

      r.on(RoomEvent.ParticipantDisconnected, () => {
        syncRemoteParticipants(r);
      });

      r.on(RoomEvent.LocalTrackPublished, () => {
        syncLocalTracks(r);
      });

      r.on(RoomEvent.LocalTrackUnpublished, () => {
        syncLocalTracks(r);
      });

      r.on(RoomEvent.ActiveSpeakersChanged, () => {
        syncRemoteParticipants(r);
      });

      r.on(RoomEvent.TrackMuted, () => {
        syncLocalTracks(r);
        syncRemoteParticipants(r);
      });

      r.on(RoomEvent.TrackUnmuted, () => {
        syncLocalTracks(r);
        syncRemoteParticipants(r);
      });

      const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";
      await r.connect(LIVEKIT_URL, token);

      await r.localParticipant.setMicrophoneEnabled(true);
      if (kind === "VIDEO") {
        await r.localParticipant.setCameraEnabled(true);
      }
    } catch (err: any) {
      console.error("LiveKit join failed:", err);
      setError(err.message || "Не удалось подключиться к звонку");
      setState("IDLE");
      roomRef.current?.disconnect();
      roomRef.current = null;
      setRoom(null);
    }
  }, [myUser, syncLocalTracks, syncRemoteParticipants]);

  const leaveRoom = React.useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setRoom(null);
    setLocalTracks(new Map());
    setRemoteParticipants(new Map());
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setState("IDLE");
  }, []);

  const toggleMute = React.useCallback(() => {
    const r = roomRef.current;
    if (!r) return;
    const next = !isMuted;
    r.localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = React.useCallback(() => {
    const r = roomRef.current;
    if (!r) return;
    const next = !isCameraOff;
    r.localParticipant.setCameraEnabled(!next);
    setIsCameraOff(next);
  }, [isCameraOff]);

  const toggleScreenShare = React.useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    if (isScreenSharing) {
      await r.localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
    } else {
      await r.localParticipant.setScreenShareEnabled(true);
      setIsScreenSharing(true);
    }
  }, [isScreenSharing]);

  React.useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  return {
    state,
    room,
    localTracks,
    remoteParticipants,
    error,
    isMuted,
    isCameraOff,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  };
}
