"use client";

import * as React from "react";
import {
  Gift,
  Coins,
  Crown,
  SmilePlus,
  Puzzle,
  Award,
  Image,
  Loader2,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";
import { GIFT_CATALOG } from "@/lib/gift-catalog";

interface GrantHistory {
  id: string;
  type: string;
  userId: string;
  details: any;
  actor: { id: string; username: string; displayName: string };
  createdAt: string;
}

interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

const GRANT_TYPES = [
  { value: "balance", label: "Balance (NC)", icon: Coins, description: "Credit NC to user wallet" },
  { value: "premium", label: "Premium", icon: Crown, description: "Grant premium subscription" },
  { value: "gift", label: "Gift", icon: Gift, description: "Send a gift to user" },
  { value: "sticker_pack", label: "Sticker Pack", icon: SmilePlus, description: "Link a sticker pack" },
  { value: "achievement", label: "Achievement", icon: Award, description: "Unlock an achievement" },
  { value: "badge", label: "Badge", icon: Puzzle, description: "Set user badge" },
  { value: "frame", label: "Frame", icon: Image, description: "Add profile frame" },
  { value: "background", label: "Background", icon: Image, description: "Add profile background" },
  { value: "spin", label: "Extra Spin", icon: RotateCcw, description: "Grant an extra spin" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  balance: "Balance",
  premium: "Premium",
  gift: "Gift",
  sticker_pack: "Sticker Pack",
  achievement: "Achievement",
  badge: "Badge",
  frame: "Frame",
  background: "Background",
  spin: "Spin",
};

const TYPE_COLORS: Record<string, string> = {
  balance: "bg-emerald-500/15 text-emerald-400",
  premium: "bg-yellow-500/15 text-yellow-400",
  gift: "bg-pink-500/15 text-pink-400",
  sticker_pack: "bg-blue-500/15 text-blue-400",
  achievement: "bg-purple-500/15 text-purple-400",
  badge: "bg-orange-500/15 text-orange-400",
  frame: "bg-cyan-500/15 text-cyan-400",
  background: "bg-teal-500/15 text-teal-400",
  spin: "bg-violet-500/15 text-violet-400",
};

export default function AdminGrantsPage() {
  const [grantType, setGrantType] = React.useState<string>("balance");
  const [userSearch, setUserSearch] = React.useState("");
  const [userResults, setUserResults] = React.useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<UserSearchResult | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(true);

  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [planId, setPlanId] = React.useState("");
  const [durationDays, setDurationDays] = React.useState("");
  const [giftType, setGiftType] = React.useState("standard");
  const [packId, setPackId] = React.useState("");
  const [achievementCode, setAchievementCode] = React.useState("");
  const [badgeName, setBadgeName] = React.useState("");
  const [frameId, setFrameId] = React.useState("");
  const [bgId, setBgId] = React.useState("");

  const [history, setHistory] = React.useState<GrantHistory[]>([]);
  const [historyTotal, setHistoryTotal] = React.useState(0);
  const [historyPage, setHistoryPage] = React.useState(1);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const searchUsers = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUserResults(data.users ?? []);
      }
    } catch {} finally {
      setSearching(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(timer);
  }, [userSearch, searchUsers]);

  const loadHistory = React.useCallback(async (page: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/grant?page=${page}&limit=20`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.grants ?? []);
        setHistoryTotal(data.total ?? 0);
      }
    } catch {} finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory(historyPage);
  }, [historyPage, loadHistory]);

  const resetForm = () => {
    setAmount("");
    setReason("");
    setPlanId("");
    setDurationDays("");
    setGiftType("standard");
    setPackId("");
    setAchievementCode("");
    setBadgeName("");
    setFrameId("");
    setBgId("");
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Select a user first");
      return;
    }

    const body: any = { userId: selectedUser.id, type: grantType };

    switch (grantType) {
      case "balance": {
        const amt = Number(amount);
        if (!amt || amt === 0) {
          toast.error("Enter a valid amount");
          return;
        }
        body.amount = amt;
        if (reason) body.reason = reason;
        break;
      }
      case "premium": {
        if (!planId.trim()) {
          toast.error("Enter plan ID");
          return;
        }
        body.planId = planId.trim();
        if (durationDays) body.durationDays = Number(durationDays);
        break;
      }
      case "gift": {
        body.giftType = giftType;
        if (amount) body.amount = Number(amount);
        break;
      }
      case "sticker_pack": {
        if (!packId.trim()) {
          toast.error("Enter pack ID");
          return;
        }
        body.packId = packId.trim();
        break;
      }
      case "achievement": {
        if (!achievementCode.trim()) {
          toast.error("Enter achievement code");
          return;
        }
        body.code = achievementCode.trim();
        break;
      }
      case "badge": {
        if (!badgeName.trim()) {
          toast.error("Enter badge name");
          return;
        }
        body.badgeName = badgeName.trim();
        break;
      }
      case "frame": {
        if (!frameId.trim()) {
          toast.error("Enter frame ID");
          return;
        }
        body.frameId = frameId.trim();
        break;
      }
      case "background": {
        if (!bgId.trim()) {
          toast.error("Enter background ID");
          return;
        }
        body.bgId = bgId.trim();
        break;
      }
      case "spin":
        break;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`${TYPE_LABELS[grantType]} granted to @${selectedUser.username}`);
        resetForm();
        loadHistory(1);
        setHistoryPage(1);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Grant failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(historyTotal / 20));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grant System</h1>
        <p className="text-sm text-muted-foreground">
          Issue items, currency, and perks to any user
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* User Search */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Target User
            </h2>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                    {selectedUser.displayName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedUser.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserSearch("");
                    setUserResults([]);
                    setShowSearch(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by username or ID..."
                  className="w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {userResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserSearch("");
                          setUserResults([]);
                          setShowSearch(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {u.displayName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grant Type Selector */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Grant Type
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {GRANT_TYPES.map((gt) => {
                const Icon = gt.icon;
                const active = grantType === gt.value;
                return (
                  <button
                    key={gt.value}
                    type="button"
                    onClick={() => setGrantType(gt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{gt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Form */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {TYPE_LABELS[grantType]} Settings
            </h2>

            {grantType === "balance" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Amount (NC)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Reason (optional)</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Compensation"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {grantType === "premium" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Plan ID</label>
                  <input
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    placeholder="e.g. plan_monthly_premium"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Duration Override (days, optional)
                  </label>
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="Default from plan"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {grantType === "gift" && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Gift Type</label>
                  <select
                    value={giftType}
                    onChange={(e) => setGiftType(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  >
                    {GIFT_CATALOG.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.emoji} {g.name} — {g.rarity}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Price (NC, optional)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {grantType === "sticker_pack" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Sticker Pack ID</label>
                <input
                  value={packId}
                  onChange={(e) => setPackId(e.target.value)}
                  placeholder="e.g. pack_abc123"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            )}

            {grantType === "achievement" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Achievement Code</label>
                <input
                  value={achievementCode}
                  onChange={(e) => setAchievementCode(e.target.value)}
                  placeholder="e.g. first_message"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            )}

            {grantType === "badge" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Badge Name</label>
                <input
                  value={badgeName}
                  onChange={(e) => setBadgeName(e.target.value)}
                  placeholder="e.g. Verified"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            )}

            {grantType === "frame" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Frame ID</label>
                <input
                  value={frameId}
                  onChange={(e) => setFrameId(e.target.value)}
                  placeholder="e.g. frame_gold_v1"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            )}

            {grantType === "background" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Background ID</label>
                <input
                  value={bgId}
                  onChange={(e) => setBgId(e.target.value)}
                  placeholder="e.g. bg_space_01"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
            )}

            {grantType === "spin" && (
              <p className="text-sm text-muted-foreground">
                This will grant 1 extra spin wheel attempt to the user.
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedUser}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Granting...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Grant {TYPE_LABELS[grantType]}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3 sticky top-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Grants
            </h2>

            {loadingHistory ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No grants yet</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {history.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-start gap-3 rounded-md border border-border p-3 text-sm"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        TYPE_COLORS[g.type] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {TYPE_LABELS[g.type] ?? g.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs text-muted-foreground">
                        @{g.actor.username} &rarr; user {g.userId?.slice(0, 8)}...
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {new Date(g.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Page {historyPage} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage <= 1}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                    disabled={historyPage >= totalPages}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
