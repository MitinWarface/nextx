/**
 * События Socket.io (клиент-сервер).
 * Импортируется и на сервере, и на клиенте.
 */
import type { MessageDTO, PublicUser, ReactionSummary, UserStatus } from "@/types";

// ============================================================
// Client → Server
// ============================================================
export interface ClientToServerEvents {
  "chat:join": (chatId: string) => void;
  "chat:leave": (chatId: string) => void;
  "typing:start": (chatId: string) => void;
  "typing:stop": (chatId: string) => void;
  "call:offer": (payload: {
    callId: string;
    to: string;
    from: { id: string; displayName: string; avatarUrl: string | null };
    sdp: RTCSessionDescriptionInit;
    kind: "AUDIO" | "VIDEO";
  }) => void;
  "call:answer": (payload: {
    callId: string;
    to: string;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "call:ice": (payload: {
    callId: string;
    to: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  "call:hangup": (payload: { callId: string; to: string }) => void;
  "call:decline": (payload: { callId: string; to: string }) => void;
  // Group calls (mesh WebRTC)
  "call:group-invite": (payload: {
    chatId: string;
    callId: string;
    from: { id: string; displayName: string; avatarUrl: string | null };
    kind: "AUDIO" | "VIDEO";
  }) => void;
  "call:group-peer": (payload: {
    callId: string;
    to: string;
    from: { id: string; displayName: string; avatarUrl: string | null };
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "call:group-answer": (payload: {
    callId: string;
    to: string;
    fromId: string;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "call:group-ice": (payload: {
    callId: string;
    to: string;
    fromId: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  "call:group-leave": (payload: { callId: string; to: string }) => void;
  // Voice channels
  "voice:join": (payload: { channelId: string }) => void;
  "voice:leave": (payload: { channelId: string }) => void;
  // Co-watching
  "cowatch:join": (payload: { sessionId: string }) => void;
  "cowatch:leave": (payload: { sessionId: string }) => void;
  "cowatch:sync": (payload: {
    sessionId: string;
    action: string;
    currentTime: number;
  }) => void;
  "cowatch:chat": (payload: {
    sessionId: string;
    message: string;
  }) => void;
}

// ============================================================
// Server → Client
// ============================================================
export interface ServerToClientEvents {
  "message:new": (message: MessageDTO) => void;
  "message:edited": (message: MessageDTO) => void;
  "message:deleted": (payload: { chatId: string; messageId: string }) => void;
  "message:pinned": (payload: {
    chatId: string;
    messageId: string;
    isPinned: boolean;
    pinnedAt: string | null;
    pinnedById: string | null;
    message: MessageDTO;
  }) => void;
  "message:read": (payload: {
    chatId: string;
    userId: string;
    messageId: string;
  }) => void;
  "reaction:updated": (payload: {
    chatId: string;
    messageId: string;
    reactions: ReactionSummary[];
  }) => void;
  "typing:start": (payload: { chatId: string; userId: string }) => void;
  "typing:stop": (payload: { chatId: string; userId: string }) => void;
  "presence:update": (payload: {
    userId: string;
    status: UserStatus;
    lastSeen: number;
  }) => void;
  "chat:updated": (payload: { chatId: string; lastMessageAt: string }) => void;
  "poll:updated": (payload: {
    chatId: string;
    messageId: string;
    pollId: string;
    results: Array<{ optionId: string; text: string; count: number; userIds: string[] }>;
    totalVotes: number;
  }) => void;
  "call:offer": (payload: {
    callId: string;
    from: { id: string; displayName: string; avatarUrl: string | null };
    sdp: RTCSessionDescriptionInit;
    kind: "AUDIO" | "VIDEO";
  }) => void;
  "call:answer": (payload: {
    callId: string;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "call:ice": (payload: {
    callId: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  "call:hangup": (payload: { callId: string }) => void;
  "call:decline": (payload: { callId: string }) => void;
  // Group calls (client ↔ server)
  "call:group-invite": (payload: {
    chatId: string;
    callId: string;
    from: { id: string; displayName: string; avatarUrl: string | null };
    kind: "AUDIO" | "VIDEO";
  }) => void;
  "call:group-peer": (payload: {
    callId: string;
    from: { id: string; displayName: string; avatarUrl: string | null };
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "call:group-answer": (payload: {
    callId: string;
    fromId: string;
    sdp: RTCSessionDescriptionInit;
  }) => void;
  "call:group-ice": (payload: {
    callId: string;
    fromId: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  "call:group-leave": (payload: { callId: string }) => void;
  // Voice channels
  "voice:join": (payload: { channelId: string; user: { id: string; username: string; displayName: string; avatarUrl: string | null } }) => void;
  "voice:leave": (payload: { channelId: string; userId: string }) => void;
  // Co-watching
  "cowatch:viewer-joined": (payload: {
    sessionId: string;
    userId: string;
    username: string;
  }) => void;
  "cowatch:viewer-left": (payload: {
    sessionId: string;
    userId: string;
  }) => void;
  "cowatch:sync": (payload: {
    sessionId: string;
    action: string;
    currentTime: number;
    userId: string;
  }) => void;
  "cowatch:chat": (payload: {
    sessionId: string;
    userId: string;
    username: string;
    message: string;
    createdAt: number;
  }) => void;
}

// Данные сокета после auth-middleware
export interface SocketData {
  userId: string;
  username: string;
}

// Утилита: типизированный emit
export type AppSocket = {
  emit: <E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) => void;
  on: <E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E],
  ) => void;
  off: <E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E],
  ) => void;
};
