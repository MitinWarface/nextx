"use client";

import * as React from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Users } from "lucide-react";
import { ACCESS_MATRIX, type AdminRole, type SECTION, type Permission } from "@/lib/admin-permissions";

const ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "Owner",
  SUPER_ADMIN: "Super Admin",
  DEVELOPER: "Developer",
  SENIOR_MODERATOR: "Senior Moderator",
  MODERATOR: "Moderator",
  SUPPORT_LEAD: "Support Lead",
  SUPPORT: "Support",
  PAYMENTS_MANAGER: "Payments Manager",
  MARKETING_MANAGER: "Marketing Manager",
  ANALYTICS_MANAGER: "Analytics Manager",
};

const ROLE_BADGE_COLORS: Record<AdminRole, string> = {
  OWNER: "bg-red-500/15 text-red-400 border-red-500/30",
  SUPER_ADMIN: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DEVELOPER: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  SENIOR_MODERATOR: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  MODERATOR: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  SUPPORT_LEAD: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  SUPPORT: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  PAYMENTS_MANAGER: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  MARKETING_MANAGER: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  ANALYTICS_MANAGER: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const SECTION_LABELS: Record<SECTION, string> = {
  dashboard: "Dashboard",
  users: "Users",
  chats: "Chats",
  channels: "Channels",
  reports: "Reports",
  moderation: "Moderation",
  premium: "Premium",
  payments: "Payments",
  broadcasts: "Broadcasts",
  statistics: "Statistics",
  system: "System",
  roles: "Roles",
  audit: "Audit Logs",
  feature_flags: "Feature Flags",
  devices: "Devices",
  security: "Security",
  rate_limits: "Rate Limits",
  promo_codes: "Promo Codes",
  segments: "Segments",
  ai: "AI Control",
  content: "Storage",
  legal: "Legal",
  notifications: "Notifications",
  abuse: "Abuse",
  remote_config: "Remote Config",
  business: "Business",
  data_export: "Экспорт данных",
  seasonal: "Seasonal Events",
  ads: "Ad Campaigns",
  grants: "Grant System",
};

const PERMISSION_BADGE: Record<Permission, string> = {
  manage: "bg-green-500/10 text-green-500",
  read: "bg-blue-500/10 text-blue-500",
  none: "bg-muted text-muted-foreground",
};

interface RoleRow {
  role: AdminRole;
  userCount: number;
}

interface RoleUsers {
  [role: string]: Array<{ id: string; username: string; displayName: string }>;
}

export default function RolesPage() {
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [roleUsers, setRoleUsers] = React.useState<RoleUsers>({});
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingUsers, setLoadingUsers] = React.useState(false);

  React.useEffect(() => {
    const allRoles = Object.keys(ACCESS_MATRIX) as AdminRole[];
    Promise.all(
      allRoles.map((role) =>
        fetch(`/api/admin/users?role=${role}&limit=100`, { credentials: "include" })
          .then((r) => r.json())
          .then((d) => ({ role, total: d.data?.total ?? d.total ?? 0, users: d.data?.users ?? d.users ?? [] }))
          .catch(() => ({ role, total: 0, users: [] }))
      )
    )
      .then((results) => {
        setRoles(results.map((r) => ({ role: r.role, userCount: r.total })));
        const usersMap: RoleUsers = {};
        results.forEach((r) => {
          usersMap[r.role] = r.users;
        });
        setRoleUsers(usersMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (role: string) => {
    if (expanded === role) {
      setExpanded(null);
      return;
    }
    setExpanded(role);
    if (!roleUsers[role] || roleUsers[role].length === 0) {
      setLoadingUsers(true);
      try {
        const res = await fetch(`/api/admin/users?role=${role}&limit=50`, { credentials: "include" });
        if (res.ok) {
          const d = await res.json();
          setRoleUsers((prev) => ({ ...prev, [role]: d.data?.users ?? d.users ?? [] }));
        }
      } catch {} finally {
        setLoadingUsers(false);
      }
    }
  };

  const getPermissionsSummary = (role: AdminRole): string => {
    const matrix = ACCESS_MATRIX[role];
    const sections = Object.keys(matrix) as SECTION[];
    const manage = sections.filter((s) => matrix[s] === "manage").length;
    const read = sections.filter((s) => matrix[s] === "read").length;
    return `${manage} manage, ${read} read`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Роли</h1>
        <div className="text-center text-muted-foreground py-8">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Роли</h1>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
              <th className="p-3 w-8" />
              <th className="p-3">Роль</th>
              <th className="p-3">Badge</th>
              <th className="p-3 text-right">Пользователей</th>
              <th className="p-3">Права</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const isExpanded = expanded === r.role;
              return (
                <React.Fragment key={r.role}>
                  <tr
                    className="border-b border-border/50 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => handleExpand(r.role)}
                  >
                    <td className="p-3">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-3 font-medium">{ROLE_LABELS[r.role]}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGE_COLORS[r.role]}`}
                      >
                        {r.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {r.userCount}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {getPermissionsSummary(r.role)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="bg-muted/20 p-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                              Доступ к секциям
                            </h4>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                              {(Object.keys(ACCESS_MATRIX[r.role]) as SECTION[]).map((section) => {
                                const perm = ACCESS_MATRIX[r.role][section];
                                return (
                                  <div
                                    key={section}
                                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                                  >
                                    <span className="text-xs">{SECTION_LABELS[section]}</span>
                                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${PERMISSION_BADGE[perm]}`}>
                                      {perm}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                              Пользователи с ролью {ROLE_LABELS[r.role]}
                            </h4>
                            {loadingUsers && expanded === r.role && roleUsers[r.role]?.length === 0 ? (
                              <div className="text-xs text-muted-foreground py-2">Загрузка...</div>
                            ) : (roleUsers[r.role] ?? []).length === 0 ? (
                              <div className="text-xs text-muted-foreground py-2">Нет пользователей</div>
                            ) : (
                              <div className="space-y-1">
                                {(roleUsers[r.role] ?? []).map((u) => (
                                  <div
                                    key={u.id}
                                    className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-accent/50"
                                  >
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium">
                                      {u.displayName.charAt(0)}
                                    </div>
                                    <span className="text-xs">{u.displayName}</span>
                                    <span className="text-xs text-muted-foreground">@{u.username}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
