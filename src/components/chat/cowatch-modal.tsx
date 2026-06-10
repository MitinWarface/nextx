"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Play, Pause, Send, Users, Link as LinkIcon, Loader2, Hand } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "@/store/toast-store";

interface CowatchModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  videoUrl: string;
  chatId?: string;
}

interface Viewer {
  userId: string;
  username: string;
}

interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  createdAt: number;
}

export function CowatchModal({
  open,
  onClose,
  sessionId,
  videoUrl,
  chatId,
}: CowatchModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [viewers, setViewers] = React.useState<Viewer[]>([]);
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [handRaised, setHandRaised] = React.useState(false);
  const { socket } = useSocket();

  // Extract embeddable URL from video URL
  const embedUrl = React.useMemo(() => {
    try {
      const url = new URL(videoUrl);
      // YouTube
      if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be") {
        let videoId = "";
        if (url.hostname === "youtu.be") {
          videoId = url.pathname.slice(1);
        } else {
          videoId = url.searchParams.get("v") ?? "";
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
      }
      // Vimeo
      if (url.hostname.includes("vimeo.com")) {
        const match = url.pathname.match(/\/(\d+)/);
        if (match) return `https://player.vimeo.com/video/${match[1]}`;
      }
    } catch {}
    return videoUrl;
  }, [videoUrl]);

  // Socket listeners
  React.useEffect(() => {
    if (!open || !socket) return;

    socket.emit("cowatch:join", { sessionId });

    const handleViewerJoined = (data: { sessionId: string; userId: string; username: string }) => {
      if (data.sessionId !== sessionId) return;
      setViewers((prev) => {
        if (prev.some((v) => v.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, username: data.username }];
      });
    };

    const handleViewerLeft = (data: { sessionId: string; userId: string }) => {
      if (data.sessionId !== sessionId) return;
      setViewers((prev) => prev.filter((v) => v.userId !== data.userId));
    };

    const handleSync = (data: {
      sessionId: string;
      action: string;
      currentTime: number;
      userId: string;
    }) => {
      if (data.sessionId !== sessionId) return;
      const video = videoRef.current;
      if (!video) return;

      setSyncing(true);
      switch (data.action) {
        case "play":
          video.currentTime = data.currentTime;
          video.play().catch(() => {});
          setIsPlaying(true);
          break;
        case "pause":
          video.currentTime = data.currentTime;
          video.pause();
          setIsPlaying(false);
          break;
        case "seek":
          video.currentTime = data.currentTime;
          break;
        case "time":
          // Smooth time sync — only correct if drift > 1s
          if (Math.abs(video.currentTime - data.currentTime) > 1) {
            video.currentTime = data.currentTime;
          }
          break;
      }
      setTimeout(() => setSyncing(false), 100);
    };

    const handleChat = (data: ChatMessage & { sessionId: string }) => {
      if (data.sessionId !== sessionId) return;
      setChatMessages((prev) => [...prev, data]);
    };

    socket.on("cowatch:viewer-joined", handleViewerJoined);
    socket.on("cowatch:viewer-left", handleViewerLeft);
    socket.on("cowatch:sync", handleSync);
    socket.on("cowatch:chat", handleChat);

    return () => {
      socket.off("cowatch:viewer-joined", handleViewerJoined);
      socket.off("cowatch:viewer-left", handleViewerLeft);
      socket.off("cowatch:sync", handleSync);
      socket.off("cowatch:chat", handleChat);
      socket.emit("cowatch:leave", { sessionId });
    };
  }, [open, socket, sessionId]);

  // Auto-scroll chat
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const emitSync = React.useCallback(
    (action: string, currentTime: number) => {
      if (!socket || syncing) return;
      socket.emit("cowatch:sync", { sessionId, action, currentTime });
    },
    [socket, sessionId, syncing],
  );

  const handlePlay = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
      emitSync("play", video.currentTime);
    } else {
      video.pause();
      setIsPlaying(false);
      emitSync("pause", video.currentTime);
    }
  }, [emitSync]);

  const handleSeek = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    emitSync("seek", video.currentTime);
  }, [emitSync]);

  // Time sync broadcast every 5s while playing
  React.useEffect(() => {
    if (!open || !isPlaying) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        emitSync("time", video.currentTime);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [open, isPlaying, emitSync]);

  const handleSendChat = React.useCallback(() => {
    if (!chatInput.trim() || !socket) return;
    socket.emit("cowatch:chat", { sessionId, message: chatInput.trim() });
    setChatInput("");
  }, [chatInput, socket, sessionId]);

  const handleCopyLink = React.useCallback(() => {
    const url = `${window.location.origin}/cowatch/${sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Ссылка скопирована");
    });
  }, [sessionId]);

  const handleToggleHand = React.useCallback(() => {
    setHandRaised((prev) => {
      const next = !prev;
      if (socket) {
        socket.emit("cowatch:chat", {
          sessionId,
          message: next ? "\ud83d\udc4b" : "\ud83d\udc4b\u0001",
        });
      }
      if (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).__ioInstance) {
        try {
          const io = (globalThis as Record<string, unknown>).__ioInstance as { emit: (event: string, payload: unknown) => void };
          io.emit("cowatch:hand-raise", { sessionId, raised: next });
        } catch { /* ignore */ }
      }
      return next;
    });
  }, [socket, sessionId]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Совместный просмотр</h2>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <Users className="h-3 w-3" />
              {viewers.length + 1}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              <LinkIcon className="h-3 w-3" />
              Пригласить
            </button>
            <button
              type="button"
              onClick={handleToggleHand}
              className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                handRaised
                  ? "border-amber-500 bg-amber-500/10 text-amber-600"
                  : "border-border hover:bg-accent"
              }`}
              title={handRaised ? "Опустить руку" : "Поднять руку"}
            >
              ✋
              {handRaised && <span className="text-xs font-medium">Вы подняли руку</span>}
            </button>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-accent">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Video area */}
          <div className="relative flex flex-1 flex-col bg-black">
            <div className="flex flex-1 items-center justify-center">
              <iframe
                src={embedUrl}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Co-watching video"
              />
            </div>
            <div className="flex items-center gap-3 border-t border-border bg-background p-3">
              <button
                type="button"
                onClick={handlePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <span className="text-xs text-muted-foreground">
                {isPlaying ? "Воспроизведение" : "На паузе"} • Все зрители синхронизированы
              </span>
            </div>
          </div>

          {/* Sidebar: viewers + chat */}
          <div className="flex w-72 flex-col border-l border-border">
            {/* Viewers list */}
            <div className="border-b border-border p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Зрители ({viewers.length + 1})
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Вы</span>
                {viewers.map((v) => (
                  <span key={v.userId} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {v.username}
                  </span>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-3">
                {chatMessages.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    Обсуждайте видео здесь
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className="mb-2">
                    <span className="text-xs font-semibold text-primary">{msg.username}: </span>
                    <span className="text-xs">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2 border-t border-border p-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Сообщение..."
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  className="rounded-md bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
