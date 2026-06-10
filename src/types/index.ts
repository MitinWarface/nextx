// Глобальные типы для мессенджера

export type UserStatus = "ONLINE" | "OFFLINE" | "AWAY" | "DO_NOT_DISTURB";
export type ChatType = "PRIVATE" | "GROUP" | "CHANNEL" | "SERVICE" | "SELF";
export type ParticipantRole = "OWNER" | "ADMIN" | "MEMBER";
export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "FILE"
  | "AUDIO"
  | "VOICE"
  | "STICKER"
  | "SYSTEM"
  | "LOCATION"
  | "CONTACT"
  | "POLL"
  | "TASK_LIST"
  | "VOICE_POST"
  | "VIDEO_CIRCLE";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  lastSeenAt: string;
  role?: string;
  premiumStatus?: string;
  stealthMode?: boolean;
  usernameHistory?: string[];
  bio?: string | null;
}

export interface ChatPreview {
  id: string;
  type: ChatType;
  name: string | null;
  avatarUrl: string | null;
  description?: string | null;
  lastMessage: MessageDTO | null;
  lastMessageAt: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isVerified?: boolean;
  participants: PublicUser[];
  myRole?: ParticipantRole;
  defaultTtlSeconds?: number | null;
  chatPinHash?: string | null;
  colorLabel?: string | null;
  isContentProtected?: boolean;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ReplyPreview {
  id: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  fileName?: string | null;
  sender: Pick<PublicUser, "id" | "username" | "displayName" | "avatarUrl" | "premiumStatus">;
}

export interface ForwardedFrom {
  id: string;
  senderId: string;
  chatId: string;
  chatName: string | null;
  senderName: string;
  createdAt: string;
}

export interface MessageDTO {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  mediaUrl: string | null;
  thumbnailUrl?: string | null;
  hlsUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  replyToId: string | null;
  replyTo?: ReplyPreview | null;
  forwardedFromId?: string | null;
  forwardedFrom?: ForwardedFrom | null;
  isEdited: boolean;
  editedAt?: string | null;
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedBy?: Pick<PublicUser, "id" | "displayName"> | null;
  createdAt: string;
  sender?: Pick<PublicUser, "id" | "username" | "displayName" | "avatarUrl" | "premiumStatus">;
  reactions?: ReactionSummary[];
  status?: "sending" | "sent" | "delivered" | "read" | "error";
  mentions?: string[];
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImage?: string | null;
  linkSiteName?: string | null;
  linkUrl?: string | null;
  keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>> | null;
  expiresAt?: string | null;
  poll?: {
    id: string;
    question: string;
    multiChoice: boolean;
    isClosed: boolean;
    closesAt: string | null;
    options: Array<{ id: string; text: string; order?: number; count?: number; votes?: number; userIds?: string[] }>;
  } | null;
  taskItems?: Array<{ id: string; text: string; done: boolean; sortOrder: number }> | null;
  isPaid?: boolean;
  paidPrice?: number | null;
  isUnlocked?: boolean;
  isSilent?: boolean;
  isStealth?: boolean;
  isAnonymousForward?: boolean;
  isViewOnce?: boolean;
  isProtected?: boolean;
  isDeleted?: boolean;
  viewCount?: number;
  forwardCount?: number;
  copyCount?: number;
  albumId?: string | null;
}

export interface SendMessagePayload {
  chatId: string;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  hlsUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  forwardedFromId?: string;
  clientTempId: string;
  isStealth?: boolean;
  isAnonymousForward?: boolean;
  albumId?: string;
}

export interface SocketEvents {
  "message:new": (message: MessageDTO) => void;
  "message:edited": (message: MessageDTO) => void;
  "message:deleted": (payload: { chatId: string; messageId: string }) => void;
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
  "chat:updated": (chat: ChatPreview) => void;
}
