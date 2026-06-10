"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { getAccessibleSections, type SECTION } from "@/lib/admin-permissions";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Megaphone,
  AlertTriangle,
  Shield,
  Crown,
  CreditCard,
  Send,
  BarChart3,
  Server,
  ShieldCheck,
  ScrollText,
  ArrowLeft,
  Flag,
  Smartphone,
  ShieldAlert,
  Gauge,
  Tag,
  UsersRound,
  Brain,
  HardDrive,
  Scale,
  Bell,
  Search,
  Settings,
  Building,
  Download,
  Calendar,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_META: Record<SECTION, { label: string; icon: React.ElementType; href: string }> = {
  dashboard:     { label: "Dashboard",     icon: LayoutDashboard, href: "/admin/dashboard" },
  users:         { label: "Users",         icon: Users,           href: "/admin/users" },
  chats:         { label: "Chats",         icon: MessageSquare,   href: "/admin/chats" },
  channels:      { label: "Channels",      icon: Megaphone,       href: "/admin/channels" },
  reports:       { label: "Reports",       icon: AlertTriangle,   href: "/admin/reports" },
  moderation:    { label: "Moderation",    icon: Shield,          href: "/admin/moderation" },
  premium:       { label: "Premium",       icon: Crown,           href: "/admin/premium" },
  payments:      { label: "Payments",      icon: CreditCard,      href: "/admin/payments" },
  broadcasts:    { label: "Broadcasts",    icon: Send,            href: "/admin/broadcasts" },
  statistics:    { label: "Statistics",    icon: BarChart3,       href: "/admin/statistics" },
  system:        { label: "System",        icon: Server,          href: "/admin/system" },
  roles:         { label: "Roles",         icon: ShieldCheck,     href: "/admin/roles" },
  audit:         { label: "Audit Logs",    icon: ScrollText,      href: "/admin/audit" },
  feature_flags: { label: "Feature Flags", icon: Flag,            href: "/admin/feature-flags" },
  devices:       { label: "Devices",       icon: Smartphone,      href: "/admin/devices" },
  security:      { label: "Security",      icon: ShieldAlert,     href: "/admin/security" },
  rate_limits:   { label: "Rate Limits",   icon: Gauge,           href: "/admin/rate-limits" },
  promo_codes:   { label: "Promo Codes",   icon: Tag,             href: "/admin/promo-codes" },
  segments:      { label: "Segments",      icon: UsersRound,      href: "/admin/segments" },
  ai:            { label: "AI Control",    icon: Brain,           href: "/admin/ai" },
  content:       { label: "Storage",       icon: HardDrive,       href: "/admin/content" },
  legal:         { label: "Legal",         icon: Scale,           href: "/admin/legal" },
  notifications: { label: "Notifications", icon: Bell,            href: "/admin/notifications" },
  abuse:         { label: "Abuse",         icon: Search,          href: "/admin/abuse" },
  remote_config: { label: "Remote Config", icon: Settings,        href: "/admin/remote-config" },
  business:      { label: "Business",      icon: Building,        href: "/admin/business" },
  data_export:   { label: "Data Export",   icon: Download,        href: "/admin/data-export" },
  grants:        { label: "Grants",        icon: Gift,            href: "/admin/grants" },
  seasonal:      { label: "Seasonal",      icon: Calendar,        href: "/admin/seasonal" },
  ads:           { label: "Ad Campaigns",  icon: Megaphone,       href: "/admin/ads" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          router.replace("/");
          return;
        }
        setChecking(false);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  const accessibleSections = React.useMemo(() => {
    const role = user?.role as any;
    if (!role) return [] as SECTION[];
    try {
      return getAccessibleSections(role);
    } catch {
      return [] as SECTION[];
    }
  }, [user?.role]);

  const roleBadgeColor = (role?: string) => {
    switch (role) {
      case "OWNER":             return "bg-red-500/15 text-red-400 border-red-500/30";
      case "SUPER_ADMIN":       return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "DEVELOPER":         return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "SENIOR_MODERATOR":  return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "MODERATOR":         return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      case "SUPPORT_LEAD":      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "SUPPORT":           return "bg-teal-500/15 text-teal-400 border-teal-500/30";
      case "PAYMENTS_MANAGER":  return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "MARKETING_MANAGER": return "bg-pink-500/15 text-pink-400 border-pink-500/30";
      case "ANALYTICS_MANAGER": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      default:                  return "bg-muted text-muted-foreground border-border";
    }
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
        <header className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">NextX</span>
          <span className="text-xs text-muted-foreground/60">Admin</span>
        </header>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {accessibleSections.map((section) => {
            const meta = SECTION_META[section];
            const Icon = meta.icon;
            const isActive = pathname === meta.href || pathname.startsWith(meta.href + "/");
            return (
              <button
                key={section}
                type="button"
                onClick={() => router.push(meta.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {meta.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <p className="text-xs font-medium truncate">{user?.displayName}</p>
          <p className="text-[10px] text-muted-foreground/60 mb-1.5">@{user?.username}</p>
          {user?.role && (
            <span
              className={cn(
                "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                roleBadgeColor(user.role),
              )}
            >
              {user.role.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
