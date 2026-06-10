"use client";

import * as React from "react";
import { Shield, Search, Smartphone, Globe, AlertTriangle } from "lucide-react";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

interface DeviceNode {
  userId: string;
  username: string;
  displayName: string;
  devices: { id: string; deviceName: string; ipAddress: string; trustLevel: string; lastActivity: string }[];
}

export default function AbuseInvestigationPage() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<DeviceNode[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/admin/abuse/investigate?q=${encodeURIComponent(query.trim())}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch { toast.error("Ошибка"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Расследование злоупотреблений</h1>
      </div>
      <p className="text-sm text-muted-foreground">Поиск связей: пользователь → IP → устройство</p>

      {/* Search */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="ID пользователя, IP, имя устройства..."
          className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
        <button type="button" onClick={search} disabled={loading} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          <Search className="h-4 w-4" /> {loading ? "Поиск..." : "Найти"}
        </button>
      </div>

      {/* Results */}
      {searched && !loading && results.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">Ничего не найдено</div>
      )}

      <div className="space-y-4">
        {results.map((node) => (
          <div key={node.userId} className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{node.displayName} (@{node.username})</p>
                <p className="text-xs text-muted-foreground">ID: {node.userId}</p>
              </div>
            </div>
            <div className="space-y-2">
              {node.devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{d.deviceName}</p>
                      <p className="text-[10px] text-muted-foreground">IP: {d.ipAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px]",
                      d.trustLevel === "trusted" ? "bg-green-500/10 text-green-600" :
                      d.trustLevel === "suspicious" ? "bg-red-500/10 text-red-600" :
                      "bg-yellow-500/10 text-yellow-600"
                    )}>{d.trustLevel}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(d.lastActivity).toLocaleString("ru")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
