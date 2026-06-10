"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Ban,
  UserCheck,
  ExternalLink,
  Loader2,
  ChevronDown,
  ScrollText,
  X,
  Smartphone,
  Shield,
  Crown,
  AlertTriangle,
  History,
  Wallet,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  isBanned: boolean;
  isPermabanned: boolean;
  isBot: boolean;
  createdAt: string;
  lastSeenAt: string;
  avatarUrl?: string | null;
}

const ROLES = [
  { value: "OWNER", label: "Owner", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  { value: "SUPER_ADMIN", label: "Super Admin", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { value: "DEVELOPER", label: "Developer", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "SENIOR_MODERATOR", label: "Senior Moderator", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  { value: "MODERATOR", label: "Moderator", color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { value: "SUPPORT_LEAD", label: "Support Lead", color: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  { value: "SUPPORT", label: "Support", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { value: "PAYMENTS_MANAGER", label: "Payments Manager", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "MARKETING_MANAGER", label: "Marketing Manager", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  { value: "ANALYTICS_MANAGER", label: "Analytics Manager", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "ADMIN", label: "Admin", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { value: "USER", label: "User", color: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
];

function getRoleBadgeColor(role: string) {
  return ROLES.find((r) => r.value === role)?.color ?? "bg-gray-500/15 text-gray-400 border-gray-500/30";
}

function getStatusBadge(status: string, isBanned: boolean, isPermabanned?: boolean) {
  if (isPermabanned) {
    return { label: "Permabanned", className: "bg-red-600/15 text-red-600 border-red-600/30" };
  }
  if (isBanned) {
    return { label: "Banned", className: "bg-red-500/15 text-red-400 border-red-500/30" };
  }
  if (status === "ONLINE") {
    return { label: "Online", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  }
  return { label: "Offline", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function useDropdownDirection(ref: React.RefObject<HTMLDivElement | null>, open: boolean) {
  const [direction, setDirection] = React.useState<"up" | "down">("down");

  React.useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setDirection(spaceBelow < 250 && spaceAbove > spaceBelow ? "up" : "down");
  }, [open, ref]);

  return direction;
}

function Dropdown({
  trigger,
  children,
  align = "right",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const direction = useDropdownDirection(ref, open);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-50 min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-lg",
            direction === "up" ? "bottom-full mb-1" : "top-full mt-1",
            align === "right" ? "right-0" : "left-0",
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        "text-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function RoleSelect({
  currentRole,
  userId,
  onChange,
}: {
  currentRole: string;
  userId: string;
  onChange: (userId: string, role: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const direction = useDropdownDirection(ref, open);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentRoleData = ROLES.find((r) => r.value === currentRole) ?? ROLES[ROLES.length - 1];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80",
          currentRoleData.color,
        )}
      >
        {currentRoleData.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className={cn(
          "absolute left-0 z-50 max-h-64 w-48 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg",
          direction === "up" ? "bottom-full mb-1" : "top-full mt-1",
        )}>
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => {
                onChange(userId, role.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                role.value === currentRole && "bg-accent/50",
              )}
            >
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  role.value === "OWNER" && "bg-red-500",
                  role.value === "SUPER_ADMIN" && "bg-orange-500",
                  role.value === "DEVELOPER" && "bg-blue-500",
                  role.value === "SENIOR_MODERATOR" && "bg-indigo-500",
                  role.value === "MODERATOR" && "bg-violet-500",
                  role.value === "SUPPORT_LEAD" && "bg-teal-500",
                  role.value === "SUPPORT" && "bg-cyan-500",
                  role.value === "PAYMENTS_MANAGER" && "bg-emerald-500",
                  role.value === "MARKETING_MANAGER" && "bg-pink-500",
                  role.value === "ANALYTICS_MANAGER" && "bg-amber-500",
                  role.value === "ADMIN" && "bg-purple-500",
                  role.value === "USER" && "bg-gray-500",
                )}
              />
              {role.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [notesUserId, setNotesUserId] = React.useState<string | null>(null);
  const [notesUserName, setNotesUserName] = React.useState("");
  const [detailUserId, setDetailUserId] = React.useState<string | null>(null);
  const [detailUserName, setDetailUserName] = React.useState("");

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data?.users ?? data.users ?? []);
        setTotal(data.data?.total ?? data.total ?? 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        toast.success("Role updated successfully");
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to update role");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, isBanned: !isBanned }),
      });
      if (res.ok) {
        toast.success(isBanned ? "User unbanned" : "User banned");
        loadUsers();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to update user");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Поиск по username, имени, email или телефону..."
              className="pl-10"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            Search
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 appearance-none rounded-md border border-input bg-transparent px-3 pr-8 text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Roles</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">
            {total.toLocaleString()} users
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Display Name</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Created</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const statusBadge = getStatusBadge(user.status, user.isBanned, user.isPermabanned);
                return (
                  <tr
                    key={user.id}
                    className="border-b border-border/50 transition-colors hover:bg-accent/30"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={user.displayName || user.username}
                          src={user.avatarUrl}
                          size="sm"
                          online={user.status === "ONLINE" && !user.isBanned}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              @{user.username}
                            </span>
                            {user.isBot && (
                              <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                BOT
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate block">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-foreground">{user.displayName}</span>
                    </td>
                    <td className="p-3">
                      {actionLoading === user.id ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Updating...</span>
                        </div>
                      ) : (
                        <RoleSelect
                          currentRole={user.role}
                          userId={user.id}
                          onChange={handleRoleChange}
                        />
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                          statusBadge.className,
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            user.isBanned
                              ? "bg-red-500"
                              : user.status === "ONLINE"
                                ? "bg-emerald-500"
                                : "bg-gray-400",
                          )}
                        />
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="p-3 text-right">
                      <Dropdown
                        align="right"
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      >
                        <div className="p-1.5">
                          <p className="mb-1 px-3 py-1 text-xs font-medium text-muted-foreground">
                            Role
                          </p>
                          <div className="max-h-48 overflow-auto">
                            {ROLES.map((role) => (
                              <button
                                key={role.value}
                                type="button"
                                onClick={() => handleRoleChange(user.id, role.value)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                                  "hover:bg-accent hover:text-accent-foreground",
                                  role.value === user.role && "bg-accent/50",
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-block h-2 w-2 rounded-full",
                                    role.value === "OWNER" && "bg-red-500",
                                    role.value === "SUPER_ADMIN" && "bg-orange-500",
                                    role.value === "DEVELOPER" && "bg-blue-500",
                                    role.value === "SENIOR_MODERATOR" && "bg-indigo-500",
                                    role.value === "MODERATOR" && "bg-violet-500",
                                    role.value === "SUPPORT_LEAD" && "bg-teal-500",
                                    role.value === "SUPPORT" && "bg-cyan-500",
                                    role.value === "PAYMENTS_MANAGER" && "bg-emerald-500",
                                    role.value === "MARKETING_MANAGER" && "bg-pink-500",
                                    role.value === "ANALYTICS_MANAGER" && "bg-amber-500",
                                    role.value === "ADMIN" && "bg-purple-500",
                                    role.value === "USER" && "bg-gray-500",
                                  )}
                                />
                                {role.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="border-t border-border p-1.5">
                          <DropdownItem
                            onClick={() =>
                              handleBanToggle(user.id, user.isBanned)
                            }
                            className={cn(
                              user.isBanned
                                ? "text-emerald-500 hover:text-emerald-500"
                                : "text-red-500 hover:text-red-500",
                            )}
                          >
                            {user.isBanned ? (
                              <>
                                <UserCheck className="h-4 w-4" />
                                Unban
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4" />
                                Ban
                              </>
                            )}
                          </DropdownItem>
                          <DropdownItem onClick={() => { setDetailUserId(user.id); setDetailUserName(user.displayName); }}>
                            <Eye className="h-4 w-4" />
                            Профиль
                          </DropdownItem>
                          <DropdownItem onClick={() => router.push("/")}>
                            <ExternalLink className="h-4 w-4" />
                            Open in Messenger
                          </DropdownItem>
                          <DropdownItem onClick={() => { setNotesUserId(user.id); setNotesUserName(user.displayName); }}>
                            <ScrollText className="h-4 w-4" />
                            Заметки
                          </DropdownItem>
                        </div>
                      </Dropdown>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
            {total.toLocaleString()} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {notesUserId && (
        <UserNotesPanel
          userId={notesUserId}
          userName={notesUserName}
          onClose={() => { setNotesUserId(null); setNotesUserName(""); }}
        />
      )}

      {detailUserId && (
        <UserDetailPanel
          userId={detailUserId}
          userName={detailUserName}
          onClose={() => { setDetailUserId(null); setDetailUserName(""); }}
        />
      )}
    </div>
  );
}

function UserNotesPanel({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [notes, setNotes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newNote, setNewNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[60vh] w-full max-w-md flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">Заметки — {userName}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : notes.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Нет заметок</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-border p-3">
                <p className="text-sm">{n.content}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {n.author?.displayName ?? "Admin"} · {new Date(n.createdAt).toLocaleString("ru")}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Добавить заметку..."
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
            />
            <Button size="sm" onClick={add} disabled={saving || !newNote.trim()}>
              {saving ? "..." : "Добавить"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserDetailPanel({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"overview" | "devices" | "reports" | "history" | "notes">("overview");
  const [notes, setNotes] = React.useState<any[]>([]);
  const [notesLoading, setNotesLoading] = React.useState(false);
  const [newNote, setNewNote] = React.useState("");
  const [noteSaving, setNoteSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${userId}`, { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setData(json.data ?? json);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const loadNotes = React.useCallback(async () => {
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setNotes(json.notes ?? []);
      }
    } finally {
      setNotesLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    if (activeTab === "notes") loadNotes();
  }, [activeTab, loadNotes]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        loadNotes();
      }
    } finally {
      setNoteSaving(false);
    }
  };

  const tabs = [
    { key: "overview", label: "Обзор" },
    { key: "devices", label: "Устройства" },
    { key: "reports", label: "Жалобы" },
    { key: "history", label: "История" },
    { key: "notes", label: "Заметки" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">{userName} — Профиль</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1 border-b border-border px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm transition-colors ${
                activeTab === tab.key ? "border-b-2 border-primary text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : !data ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Ошибка загрузки</div>
          ) : activeTab === "overview" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">ID</p>
                  <p className="font-mono text-sm">{data.user.id}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{data.user.email}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Телефон</p>
                  <p className="text-sm">{data.user.phone ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Роль</p>
                  <p className="text-sm">{data.user.role}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Статус</p>
                  <p className="text-sm">{data.user.isPermabanned ? "🔴 Permabanned" : data.user.isBanned ? "🔴 Забанен" : data.user.status === "ONLINE" ? "🟢 Онлайн" : "⚪ Оффлайн"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Только чтение</p>
                  <p className="text-sm">{data.user.isReadOnly ? "Да" : "Нет"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Premium</p>
                  <p className="text-sm flex items-center gap-1">
                    {data.user.premiumStatus && data.user.premiumStatus !== "none" ? <><Crown className="h-3 w-3 text-amber-500" /> {data.user.premiumStatus}</> : "Нет"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Кошелёк</p>
                  <p className="text-sm flex items-center gap-1">
                    <Wallet className="h-3 w-3" /> {data.wallet?.balance ?? 0} {data.wallet?.currency ?? "NC"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-bold">{data.sentMessages ?? data.user._count.messages}</p>
                  <p className="text-xs text-muted-foreground">Сообщений</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-bold">{data.user._count.participants}</p>
                  <p className="text-xs text-muted-foreground">Чатов</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-bold">{data.reports?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Жалоб на него</p>
                </div>
              </div>
              {data.blockedBy?.length > 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-2">Заблокирован кем-то ({data.blockedBy.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {data.blockedBy.map((b: any) => (
                      <span key={b.ownerId} className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">@{b.owner.username}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "devices" ? (
            <div className="space-y-2">
              {data.devices?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет устройств</p>
              ) : data.devices?.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{d.deviceName}</p>
                      <p className="text-xs text-muted-foreground">{d.platform} · {d.browser} · {d.ipAddress}</p>
                      {d.city && <p className="text-xs text-muted-foreground">{d.city}, {d.country}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${
                      d.trustLevel === "trusted" ? "bg-emerald-500/10 text-emerald-500" :
                      d.trustLevel === "suspicious" ? "bg-red-500/10 text-red-500" :
                      "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {d.trustLevel}
                    </span>
                    {d.isRevoked && <span className="ml-1 text-xs text-red-400">Отозвано</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "reports" ? (
            <div className="space-y-2">
              {data.reports?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет жалоб</p>
              ) : data.reports?.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.reason}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      r.status === "OPEN" ? "bg-yellow-500/10 text-yellow-500" :
                      r.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-500" :
                      "bg-muted text-muted-foreground"
                    }`}>{r.status}</span>
                  </div>
                  {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    От: @{r.reporter?.username} · {new Date(r.createdAt).toLocaleString("ru")}
                  </p>
                </div>
              ))}
              {data.reportsFiled?.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">Поданные жалобы:</p>
                  {data.reportsFiled.map((r: any) => (
                    <div key={r.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{r.reason}</span>
                        <span className="text-xs text-muted-foreground">{r.status}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        На: @{r.target?.username} · {new Date(r.createdAt).toLocaleString("ru")}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : activeTab === "history" ? (
            <div className="space-y-2">
              {data.loginHistory?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет истории входов</p>
              ) : data.loginHistory?.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{l.ipAddress}</p>
                      <p className="text-xs text-muted-foreground">{[l.city, l.country].filter(Boolean).join(", ")} · {l.device}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs ${l.success ? "text-emerald-500" : "text-red-500"}`}>
                      {l.success ? "Успешно" : "Ошибка"}
                    </span>
                    <p className="text-[10px] text-muted-foreground">{new Date(l.createdAt).toLocaleString("ru")}</p>
                  </div>
                </div>
              ))}
              {data.auditLogs?.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-medium text-muted-foreground">Действия админа:</p>
                  {data.auditLogs.map((a: any) => (
                    <div key={a.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.target}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString("ru")}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {notesLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Загрузка...</div>
              ) : notes.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Нет заметок</div>
              ) : (
                notes.map((n: any) => (
                  <div key={n.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm">{n.content}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {n.author?.displayName ?? "Admin"} · {new Date(n.createdAt).toLocaleString("ru")}
                    </p>
                  </div>
                ))
              )}
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                  placeholder="Добавить заметку..."
                  className="flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm"
                />
                <Button size="sm" onClick={addNote} disabled={noteSaving || !newNote.trim()}>
                  {noteSaving ? "..." : "Добавить"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
