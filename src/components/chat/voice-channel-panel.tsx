"use client";

import * as React from "react";
import { Phone, PhoneOff, Mic, MicOff, Monitor, Users, Volume2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "@/store/toast-store";

interface VoiceParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface VoiceChannelData {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  sessions: Array<{
    id: string;
    userId: string;
    isMuted: boolean;
    isScreenShare: boolean;
    user: VoiceParticipant;
  }>;
}

interface VoiceChannelPanelProps {
  chatId: string;
  currentUserId: string;
}

export function VoiceChannelPanel({ chatId, currentUserId }: VoiceChannelPanelProps) {
  const [channels, setChannels] = React.useState<VoiceChannelData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const { socket } = useSocket();

  // Загрузка каналов
  const loadChannels = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/voice-channels?chatId=${chatId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  React.useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Слушаем обновления каналов через сокет
  React.useEffect(() => {
    if (!socket) return;
    const onJoin = (data: { channelId: string; user: VoiceParticipant }) => {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === data.channelId
            ? {
                ...ch,
                isActive: true,
                sessions: [
                  ...ch.sessions,
                  { id: crypto.randomUUID(), userId: data.user.id, isMuted: false, isScreenShare: false, user: data.user },
                ],
              }
            : ch,
        ),
      );
    };
    const onLeave = (data: { channelId: string; userId: string }) => {
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === data.channelId
            ? {
                ...ch,
                sessions: ch.sessions.filter((s) => s.userId !== data.userId),
                isActive: ch.sessions.filter((s) => s.userId !== data.userId).length > 0,
              }
            : ch,
        ),
      );
    };
    socket.on("voice:join", onJoin);
    socket.on("voice:leave", onLeave);
    return () => {
      socket.off("voice:join", onJoin);
      socket.off("voice:leave", onLeave);
    };
  }, [socket]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await fetch("/api/voice-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chatId, name }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreate(false);
        loadChannels();
      }
    } catch {
      toast.error("Не удалось создать канал");
    }
  };

  const handleJoin = async (channelId: string) => {
    try {
      const res = await fetch(`/api/voice-channels/${channelId}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        socket?.emit("voice:join", { channelId });
        loadChannels();
      }
    } catch {
      toast.error("Не удалось присоединиться");
    }
  };

  const handleLeave = async (channelId: string) => {
    try {
      const res = await fetch(`/api/voice-channels/${channelId}/leave`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        socket?.emit("voice:leave", { channelId });
        loadChannels();
      }
    } catch {
      toast.error("Не удалось покинуть канал");
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Загрузка каналов...</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <Volume2 className="h-3.5 w-3.5" />
          Голосовые каналы
        </h4>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          +
        </button>
      </div>

      {showCreate && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название канала..."
            className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          >
            OK
          </button>
        </div>
      )}

      {channels.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Нет голосовых каналов
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {channels.map((ch) => {
            const isInChannel = ch.sessions.some((s) => s.userId === currentUserId);
            return (
              <li
                key={ch.id}
                className={cn(
                  "rounded-lg border border-border p-2 transition-colors",
                  ch.isActive && "border-primary/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className={cn("h-3.5 w-3.5", ch.isActive ? "text-green-500" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{ch.name}</span>
                    {ch.sessions.length > 0 && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        {ch.sessions.length}
                      </Badge>
                    )}
                  </div>
                  {isInChannel ? (
                    <button
                      type="button"
                      onClick={() => handleLeave(ch.id)}
                      className="rounded-full p-1.5 text-red-500 hover:bg-red-500/10"
                      title="Покинуть"
                    >
                      <PhoneOff className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(ch.id)}
                      className="rounded-full p-1.5 text-green-500 hover:bg-green-500/10"
                      title="Присоединиться"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {ch.sessions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ch.sessions.map((s) => (
                      <div key={s.id} className="flex items-center gap-1">
                        <Avatar
                          name={s.user.displayName}
                          src={s.user.avatarUrl}
                          size="sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          {s.user.displayName}
                        </span>
                        {s.isMuted && <MicOff className="h-3 w-3 text-red-400" />}
                        {s.isScreenShare && <Monitor className="h-3 w-3 text-blue-400" />}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
