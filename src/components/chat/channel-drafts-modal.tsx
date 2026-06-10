"use client";

import * as React from "react";
import { X, Plus, Trash2, FileText, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface ChannelDraft {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ChannelDraftsModalProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  onSelect?: (content: string) => void;
}

export function ChannelDraftsModal({ open, onClose, chatId, onSelect }: ChannelDraftsModalProps) {
  const [drafts, setDrafts] = React.useState<ChannelDraft[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newContent, setNewContent] = React.useState("");
  const [selectedDraft, setSelectedDraft] = React.useState<ChannelDraft | null>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/drafts`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts);
      }
    } catch {
      toast.error("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) fetchDrafts();
  }, [open, chatId]);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/drafts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() || undefined, content: newContent.trim() }),
      });
      if (res.ok) {
        toast.success("Draft saved");
        setNewTitle("");
        setNewContent("");
        fetchDrafts();
      } else {
        toast.error("Failed to save draft");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (draftId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/drafts?id=${draftId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Draft deleted");
        if (selectedDraft?.id === draftId) setSelectedDraft(null);
        fetchDrafts();
      }
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  const handleSelect = (draft: ChannelDraft) => {
    onSelect?.(draft.content);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Channel Drafts
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
          {/* New draft form */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Draft title (optional)"
              className="text-sm"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write your post content..."
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm min-h-[80px]"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newContent.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              {creating ? "Saving..." : "Save Draft"}
            </button>
          </div>

          {/* Drafts list */}
          {loading ? (
            <div className="text-center text-xs text-muted-foreground py-4">Loading drafts...</div>
          ) : drafts.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">No drafts yet</div>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedDraft?.id === draft.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  }`}
                  onClick={() => setSelectedDraft(draft)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {draft.title && (
                        <div className="text-sm font-medium truncate">{draft.title}</div>
                      )}
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {draft.content}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(draft.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(draft);
                        }}
                        className="rounded px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
                      >
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(draft.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
