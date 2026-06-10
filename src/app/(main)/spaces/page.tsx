"use client";

import * as React from "react";
import {
  Globe,
  Lock,
  Users,
  Hash,
  Plus,
  Search,
  ArrowRight,
  Settings,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";
import { useAuthStore } from "@/store/auth-store";

interface Space {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  isPublic: boolean;
  createdAt: string;
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  _count: { members: number; channels: number };
  members?: Array<{
    id: string;
    role: string;
    user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  }>;
  channels?: Array<{
    id: string;
    name: string;
    type: string;
    position: number;
  }>;
}

export default function SpacesPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = React.useState<Space | null>(null);
  const [tab, setTab] = React.useState<"my" | "discover">("my");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({ name: "", description: "", isPublic: false });
  const [inviteUsername, setInviteUsername] = React.useState("");

  const loadSpaces = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (search) params.set("search", search);
      const res = await fetch(`/api/spaces?${params}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setSpaces(json.spaces ?? []);
      }
    } catch {
      toast.error("Failed to load spaces");
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  React.useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const loadSpaceDetail = async (spaceId: string) => {
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setSelectedSpace(json.space);
      }
    } catch {
      toast.error("Failed to load space");
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error("Name required"); return; }
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createForm),
      });
      if (res.ok) {
        toast.success("Space created");
        setShowCreate(false);
        setCreateForm({ name: "", description: "", isPublic: false });
        loadSpaces();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleJoin = async (spaceId: string) => {
    try {
      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast.success("Joined space");
        loadSpaces();
        loadSpaceDetail(spaceId);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleLeave = async (spaceId: string) => {
    if (!confirm("Leave this space?")) return;
    try {
      const res = await fetch(`/api/spaces/${spaceId}/members?leave=true`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Left space");
        setSelectedSpace(null);
        loadSpaces();
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleInvite = async (spaceId: string) => {
    if (!inviteUsername.trim()) return;
    try {
      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: inviteUsername.trim() }),
      });
      if (res.ok) {
        toast.success("Member added");
        setInviteUsername("");
        loadSpaceDetail(spaceId);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm("Delete this space? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Space deleted");
        setSelectedSpace(null);
        loadSpaces();
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleCreateChannel = async (spaceId: string, name: string) => {
    if (!name.trim()) return;
    try {
      const res = await fetch(`/api/spaces/${spaceId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        toast.success("Channel created");
        loadSpaceDetail(spaceId);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  if (selectedSpace) {
    const isMember = selectedSpace.members?.some((m) => m.user.id === userId) ?? false;
    const myMember = selectedSpace.members?.find((m) => m.role === "owner" || m.role === "admin");

    return (
      <div className="flex h-screen bg-background">
        <aside className="w-64 border-r border-border bg-sidebar p-4 flex flex-col">
          <button
            type="button"
            onClick={() => setSelectedSpace(null)}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Spaces
          </button>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg">
              {selectedSpace.icon ?? "🏠"}
            </div>
            <div>
              <h2 className="font-semibold">{selectedSpace.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedSpace._count.members} members</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Channels</h3>
              <div className="space-y-0.5">
                {selectedSpace.channels?.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    {ch.name}
                  </div>
                ))}
              </div>
              {myMember && (
                <ChannelCreator onSubmit={(name) => handleCreateChannel(selectedSpace.id, name)} />
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Members</h3>
              <div className="space-y-1">
                {selectedSpace.members?.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px]">
                      {m.user.displayName.charAt(0)}
                    </div>
                    <span className="truncate">{m.user.displayName}</span>
                    {m.role !== "member" && (
                      <span className="text-[10px] text-muted-foreground">({m.role})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3 mt-3 space-y-2">
            {myMember && (
              <div className="flex gap-1">
                <Input
                  placeholder="Username to invite"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite(selectedSpace.id)}
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleInvite(selectedSpace.id)}>
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {selectedSpace.owner?.id !== selectedSpace.members?.[0]?.user.id && isMember && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive"
                onClick={() => handleLeave(selectedSpace.id)}
              >
                Leave Space
              </Button>
            )}
            {selectedSpace.owner?.id === selectedSpace.members?.[0]?.user.id && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive"
                onClick={() => handleDeleteSpace(selectedSpace.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Space
              </Button>
            )}
          </div>
        </aside>
        <main className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Hash className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Select a channel to start chatting</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Spaces</h1>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="h-4 w-4" /> Create Space
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <h3 className="font-medium">Create New Space</h3>
          <Input
            placeholder="Space name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            placeholder="Description (optional)"
            value={createForm.description}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createForm.isPublic}
              onChange={(e) => setCreateForm((f) => ({ ...f, isPublic: e.target.checked }))}
              className="rounded"
            />
            Public (discoverable)
          </label>
          <div className="flex gap-2">
            <Button onClick={handleCreate} size="sm">Create</Button>
            <Button onClick={() => setShowCreate(false)} variant="ghost" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setTab("my")}
            className={`px-4 py-2 text-sm ${tab === "my" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            My Spaces
          </button>
          <button
            type="button"
            onClick={() => setTab("discover")}
            className={`px-4 py-2 text-sm ${tab === "discover" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            Discover
          </button>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search spaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : spaces.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {tab === "my" ? "You haven't joined any spaces yet" : "No public spaces found"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <div
              key={space.id}
              className="rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => loadSpaceDetail(space.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xl shrink-0">
                  {space.icon ?? "🏠"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{space.name}</h3>
                    {space.isPublic ? (
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  {space.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{space.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {space._count.members}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" /> {space._count.channels}
                  </span>
                </div>
                <span>by {space.owner.displayName}</span>
              </div>
              {tab === "discover" && (
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={(e) => { e.stopPropagation(); handleJoin(space.id); }}
                >
                  Join
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelCreator({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent w-full"
      >
        <Plus className="h-3 w-3" /> Add Channel
      </button>
    );
  }

  return (
    <div className="flex gap-1 px-2">
      <Input
        placeholder="Channel name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-7 text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            onSubmit(name);
            setName("");
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
    </div>
  );
}
