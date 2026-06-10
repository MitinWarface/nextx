"use client";

import * as React from "react";
import { X, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status?: string;
}

interface ContactPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contact: ContactUser) => void;
}

export function ContactPickerModal({ open, onClose, onSelect }: ContactPickerModalProps) {
  const [contacts, setContacts] = React.useState<ContactUser[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/contacts?chatted=true", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts?.map((c: any) => c.user ?? c) ?? []);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Выберите контакт</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              autoFocus
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Загрузка...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <User className="h-8 w-8 opacity-40" />
              {contacts.length === 0 ? "Нет контактов" : "Ничего не найдено"}
            </div>
          ) : (
            filtered.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => {
                  onSelect(contact);
                  onClose();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {contact.avatarUrl ? (
                    <img
                      src={contact.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    contact.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{contact.displayName}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    @{contact.username}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
