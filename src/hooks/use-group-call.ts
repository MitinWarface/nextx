"use client";

import * as React from "react";
import { useSocket } from "./use-socket";
import { useAuthStore } from "@/store/auth-store";

export type GroupCallKind = "AUDIO" | "VIDEO";
export type GroupCallState = "IDLE" | "CREATING" | "JOINING" | "CONNECTED" | "ENDED";

export interface GroupPeer {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
  isMuted: boolean;
  isCameraOff: boolean;
}

export interface GroupCallInfo {
  callId: string;
  chatId: string;
  kind: GroupCallKind;
  startedBy: string;
  startedAt: number;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  ],
};

export interface UseGroupCallResult {
  info: GroupCallInfo | null;
  state: GroupCallState;
  peers: Map<string, GroupPeer>;
  localStream: MediaStream | null;
  error: string | null;
  startGroupCall: (chatId: string, kind: GroupCallKind, participantIds: string[]) => Promise<void>;
  joinGroupCall: (callId: string, chatId: string, kind: GroupCallKind) => Promise<void>;
  leaveGroupCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
}

export function useGroupCall(): UseGroupCallResult {
  const { socket } = useSocket();
  const myUser = useAuthStore((s) => s.user);
  const [info, setInfo] = React.useState<GroupCallInfo | null>(null);
  const [state, setState] = React.useState<GroupCallState>("IDLE");
  const [peers, setPeers] = React.useState<Map<string, GroupPeer>>(new Map());
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isCameraOff, setIsCameraOff] = React.useState(false);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const peersRef = React.useRef<Map<string, GroupPeer>>(new Map());
  const infoRef = React.useRef<GroupCallInfo | null>(null);

  // Cleanup helper
  const cleanup = React.useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    peersRef.current.forEach((p) => {
      try { p.pc.close(); } catch { /* noop */ }
    });
    peersRef.current.clear();
    setPeers(new Map());
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  // --- Socket listeners ---
  React.useEffect(() => {
    if (!socket || !myUser) return;

    const onGroupInvite = (p: {
      chatId: string;
      callId: string;
      from: { id: string; displayName: string; avatarUrl: string | null };
      kind: GroupCallKind;
    }) => {
      // Show incoming group call notification via custom event
      window.dispatchEvent(new CustomEvent("group-call-incoming", {
        detail: { callId: p.callId, chatId: p.chatId, from: p.from, kind: p.kind },
      }));
    };

    const onGroupPeer = async (p: {
      callId: string;
      from: { id: string; displayName: string; avatarUrl: string | null };
      sdp: RTCSessionDescriptionInit;
    }) => {
      try {
        if (!localStreamRef.current) return;
        // New peer sending us an offer — create PC, set remote, create answer
        const pc = new RTCPeerConnection(ICE_SERVERS);
        const remoteStream = new MediaStream();
        localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
        pc.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
        };
        pc.onicecandidate = (e) => {
          if (e.candidate && infoRef.current) {
            socket.emit("call:group-ice", {
              callId: infoRef.current.callId,
              to: p.from.id,
              fromId: myUser.id,
              candidate: e.candidate.toJSON(),
            });
          }
        };
        await pc.setRemoteDescription(p.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:group-answer", {
          callId: infoRef.current?.callId ?? p.callId,
          to: p.from.id,
          fromId: myUser.id,
          sdp: answer,
        });
        const peer: GroupPeer = {
          id: p.from.id,
          displayName: p.from.displayName,
          avatarUrl: p.from.avatarUrl,
          pc,
          remoteStream,
          isMuted: false,
          isCameraOff: false,
        };
        peersRef.current.set(p.from.id, peer);
        setPeers(new Map(peersRef.current));
      } catch (err) {
        console.error("[group-call] onGroupPeer error:", err);
      }
    };

    const onGroupAnswer = async (p: {
      callId: string;
      fromId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      try {
        const peer = peersRef.current.get(p.fromId);
        if (peer) {
          await peer.pc.setRemoteDescription(p.sdp);
        }
      } catch (err) {
        console.error("[group-call] onGroupAnswer error:", err);
      }
    };

    const onGroupIce = async (p: {
      callId: string;
      fromId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        const peer = peersRef.current.get(p.fromId);
        if (peer) {
          await peer.pc.addIceCandidate(p.candidate);
        }
      } catch (err) {
        console.error("[group-call] onGroupIce error:", err);
      }
    };

    const onGroupLeave = (p: { callId: string; peerId?: string }) => {
      if (p.peerId) {
        const peer = peersRef.current.get(p.peerId);
        if (peer) {
          try { peer.pc.close(); } catch { /* noop */ }
          peersRef.current.delete(p.peerId);
          setPeers(new Map(peersRef.current));
        }
      }
    };

    socket.on("call:group-invite", onGroupInvite);
    socket.on("call:group-peer", onGroupPeer);
    socket.on("call:group-answer", onGroupAnswer);
    socket.on("call:group-ice", onGroupIce);
    socket.on("call:group-leave", onGroupLeave);

    return () => {
      socket.off("call:group-invite", onGroupInvite);
      socket.off("call:group-peer", onGroupPeer);
      socket.off("call:group-answer", onGroupAnswer);
      socket.off("call:group-ice", onGroupIce);
      socket.off("call:group-leave", onGroupLeave);
    };
  }, [socket, myUser]);

  // Unmount cleanup
  React.useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  const startGroupCall = React.useCallback(async (
    chatId: string,
    kind: GroupCallKind,
    participantIds: string[],
  ) => {
    if (!socket || !myUser) return;
    setError(null);
    setState("CREATING");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "VIDEO",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const callId = `gcall-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const callInfo: GroupCallInfo = {
        callId,
        chatId,
        kind,
        startedBy: myUser.id,
        startedAt: Date.now(),
      };
      infoRef.current = callInfo;
      setInfo(callInfo);

      // Notify all participants
      socket.emit("call:group-invite", {
        chatId,
        callId,
        from: { id: myUser.id, displayName: myUser.displayName, avatarUrl: myUser.avatarUrl ?? null },
        kind,
      });

      // Create offers to each participant
      for (const peerId of participantIds) {
        if (peerId === myUser.id) continue;
        const pc = new RTCPeerConnection(ICE_SERVERS);
        const remoteStream = new MediaStream();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("call:group-ice", {
              callId,
              to: peerId,
              fromId: myUser.id,
              candidate: e.candidate.toJSON(),
            });
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:group-peer", {
          callId,
          to: peerId,
          from: { id: myUser.id, displayName: myUser.displayName, avatarUrl: myUser.avatarUrl ?? null },
          sdp: offer,
        });
        const peer: GroupPeer = {
          id: peerId,
          displayName: "",
          avatarUrl: null,
          pc,
          remoteStream,
          isMuted: false,
          isCameraOff: false,
        };
        peersRef.current.set(peerId, peer);
      }
      setPeers(new Map(peersRef.current));
      setState("CONNECTED");
    } catch (err) {
      console.error("Group call failed:", err);
      setError("Не удалось начать групповой звонок");
      cleanup();
      setState("IDLE");
    }
  }, [socket, myUser, cleanup]);

  const joinGroupCall = React.useCallback(async (
    callId: string,
    chatId: string,
    kind: GroupCallKind,
  ) => {
    if (!socket || !myUser) return;
    setError(null);
    setState("JOINING");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "VIDEO",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const callInfo: GroupCallInfo = {
        callId,
        chatId,
        kind,
        startedBy: "",
        startedAt: Date.now(),
      };
      infoRef.current = callInfo;
      setInfo(callInfo);
      setState("CONNECTED");
    } catch (err) {
      console.error("Group call join failed:", err);
      setError("Не удалось присоединиться");
      cleanup();
      setState("IDLE");
    }
  }, [socket, myUser, cleanup]);

  const leaveGroupCall = React.useCallback(() => {
    const info = infoRef.current;
    if (socket && info && myUser) {
      socket.emit("call:group-leave", { callId: info.callId, to: info.chatId });
    }
    cleanup();
    setInfo(null);
    infoRef.current = null;
    setState("IDLE");
  }, [socket, myUser, cleanup]);

  const toggleMute = React.useCallback(() => {
    const next = !isMuted;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = React.useCallback(() => {
    const next = !isCameraOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setIsCameraOff(next);
  }, [isCameraOff]);

  return {
    info,
    state,
    peers,
    localStream,
    error,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    toggleMute,
    toggleCamera,
    isMuted,
    isCameraOff,
  };
}
