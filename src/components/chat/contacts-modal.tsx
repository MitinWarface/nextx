"use client";

import * as React from "react";
import { X, UserPlus, UserMinus, Search, UserCheck, Clock, Tag } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";
import { ContactTags } from "@/components/chat/contact-tags";

interface Contact {
  id: string;
  userId?: string;
  nickname?: string | null;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; status: string };
}

interface FriendRequest {
  id: string;
  sender?: { id: string; username: string; displayName: string; avatarUrl: string | null };
  receiver?: { id: string; username: string; displayName: string; avatarUrl: string | null };
  createdAt: string;
}

interface ContactsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenChat: (userId: string) => void;
}

export function ContactsModal({ open, onClose, onOpenChat }: ContactsModalProps) {
  const [tab, setTab] = React.useState<"contacts" | "requests" | "search">("contacts");
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [received, setReceived] = React.useState<FriendRequest[]>([]);
  const [sent, setSent] = React.useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [skillsFilter, setSkillsFilter] = React.useState("");
  const [locationFilter, setLocationFilter] = React.useState("");
  const [expandedTags, setExpandedTags] = React.useState<Set<string>>(new Set());
  const [contactTagsMap, setContactTagsMap] = React.useState<Record<string, { id: string; name: string; color: string | null }[]>>({});

  const loadContacts = React.useCallback(async () => {
    try {
      const [cRes, rRes, tagsRes] = await Promise.all([
        fetch("/api/contacts", { credentials: "include" }),
        fetch("/api/contacts/requests", { credentials: "include" }),
        fetch("/api/users/me/tags", { credentials: "include" }),
      ]);
      if (cRes.ok) {
        const d = await cRes.json();
        setContacts(d.data?.contacts ?? d.contacts ?? []);
      }
      if (rRes.ok) {
        const d = await rRes.json();
        setReceived(d.data?.received ?? d.received ?? []);
        setSent(d.data?.sent ?? d.sent ?? []);
      }
      if (tagsRes.ok) {
        const d = await tagsRes.json();
        const tags = d.tags ?? [];
        const map: Record<string, { id: string; name: string; color: string | null }[]> = {};
        for (const tag of tags) {
          try {
            const cr = await fetch(`/api/users/me/tags/${tag.id}/contacts`, { credentials: "include" });
            if (cr.ok) {
              const cd = await cr.json();
              for (const c of cd.contacts ?? []) {
                if (!map[c.id]) map[c.id] = [];
                map[c.id].push({ id: tag.id, name: tag.name, color: tag.color });
              }
            }
          } catch {}
        }
        setContactTagsMap(map);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (open) loadContacts();
  }, [open, loadContacts]);

  const handleSearch = async () => {
    if (!searchQuery.trim() && !skillsFilter.trim() && !locationFilter.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (skillsFilter.trim()) params.set("skills", skillsFilter.trim());
      if (locationFilter.trim()) params.set("location", locationFilter.trim());
      const res = await fetch(`/api/users?${params.toString()}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setSearchResults(d.users ?? d.data?.users ?? []);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleAddContact = async (userId: string) => {
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        toast.success("Контакт добавлен");
        loadContacts();
      } else {
        const err = await res.json();
        toast.error(err.error ?? err.message ?? "Ошибка");
      }
    } catch { toast.error("Ошибка сети"); }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      await fetch(`/api/contacts/${contactId}`, { method: "DELETE", credentials: "include" });
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      toast.success("Контакт удалён");
    } catch { toast.error("Ошибка"); }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await fetch(`/api/contacts/requests/${requestId}`, { method: "POST", credentials: "include" });
      toast.success("Запрос принят");
      loadContacts();
    } catch { toast.error("Ошибка"); }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await fetch(`/api/contacts/requests/${requestId}`, { method: "DELETE", credentials: "include" });
      setReceived((prev) => prev.filter((r) => r.id !== requestId));
    } catch {}
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Контакты</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex border-b border-border">
          {(["contacts", "requests", "search"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("flex-1 py-2 text-sm font-medium border-b-2 transition-colors", tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t === "contacts" ? "Контакты" : t === "requests" ? `Заявки (${received.length})` : "Найти"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-3">
          {tab === "contacts" && (
            contacts.length === 0
              ? <p className="py-8 text-center text-sm text-muted-foreground">Нет контактов</p>
              : contacts.map((c) => {
                const tagsForContact = contactTagsMap[c.user.id] ?? [];
                const isExpanded = expandedTags.has(c.user.id);
                return (
                  <div key={c.id} className="rounded-lg border border-border/50 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { onOpenChat(c.user.id); onClose(); }} className="flex flex-1 items-center gap-3">
                        <Avatar name={c.user.displayName} src={c.user.avatarUrl} size="md" />
                        <div className="text-left">
                          <div className="font-medium">{c.user.displayName}</div>
                          <div className="text-xs text-muted-foreground">@{c.user.username}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedTags((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.user.id)) next.delete(c.user.id);
                          else next.add(c.user.id);
                          return next;
                        })}
                        className={cn(
                          "rounded p-1 transition-colors",
                          isExpanded ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
                        )}
                        title="Управление тегами"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleRemoveContact(c.id)} className="rounded p-1 text-destructive hover:bg-destructive/10"><UserMinus className="h-4 w-4" /></button>
                    </div>
                    {tagsForContact.length > 0 && !isExpanded && (
                      <div className="mt-1.5 flex flex-wrap gap-1 pl-11">
                        {tagsForContact.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: t.color ?? "#3B82F6" }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {isExpanded && (
                      <div className="mt-2 pl-11">
                        <ContactTags
                          targetId={c.user.id}
                          onTagsChanged={loadContacts}
                        />
                      </div>
                    )}
                  </div>
                );
              })
          )}

          {tab === "requests" && (
            <>
              {received.length > 0 && (
                <div className="mb-3">
                  <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Входящие</h3>
                  {received.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50">
                      <Avatar name={r.sender?.displayName ?? "?"} src={r.sender?.avatarUrl ?? null} size="md" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{r.sender?.displayName}</div>
                        <div className="text-xs text-muted-foreground">Хочет добавить вас</div>
                      </div>
                      <button type="button" onClick={() => handleAcceptRequest(r.id)} className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20"><UserCheck className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleRejectRequest(r.id)} className="rounded-full bg-destructive/10 p-2 text-destructive hover:bg-destructive/20"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              {sent.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-muted-foreground">Исходящие</h3>
                  {sent.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-60">
                      <Avatar name={r.receiver?.displayName ?? "?"} src={r.receiver?.avatarUrl ?? null} size="md" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{r.receiver?.displayName}</div>
                        <div className="text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />Ожидает</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {received.length === 0 && sent.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет заявок</p>
              )}
            </>
          )}

          {tab === "search" && (
            <>
              <div className="mb-3 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Username или имя..." className="w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm" />
                  </div>
                  <button type="button" onClick={handleSearch} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">Найти</button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={skillsFilter}
                    onChange={(e) => setSkillsFilter(e.target.value)}
                    placeholder="Навыки (через запятую): react, node..."
                    className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                  <input
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Город..."
                    className="w-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {searchResults.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50">
                  <Avatar name={u.displayName} src={u.avatarUrl} size="md" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                    {u.skills?.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {u.skills.slice(0, 3).map((s: string) => (
                          <span key={s} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
                        ))}
                        {u.skills.length > 3 && <span className="text-[10px] text-muted-foreground">+{u.skills.length - 3}</span>}
                      </div>
                    )}
                    {u.location && <div className="text-[10px] text-muted-foreground">📍 {u.location}</div>}
                  </div>
                  <button type="button" onClick={() => handleAddContact(u.id)} className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20"><UserPlus className="h-4 w-4" /></button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
