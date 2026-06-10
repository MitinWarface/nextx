"use client";

import * as React from "react";
import {
  Globe,
  Check,
  X,
  ExternalLink,
  Settings,
  Loader2,
  Copy,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";
import { BuilderModal } from "@/components/builder/builder-modal";

export default function SettingsDomainsPage() {
  const [domain, setDomain] = React.useState<string | null>(null);
  const [verified, setVerified] = React.useState(false);
  const [domainInput, setDomainInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [username, setUsername] = React.useState("");

  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [builderConfig, setBuilderConfig] = React.useState<any>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/users/me/domain", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/users/me/builder", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/users/me", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([domainData, builderData, userData]) => {
        setDomain(domainData.domain);
        setVerified(domainData.verified);
        setDomainInput(domainData.domain ?? "");
        setBuilderConfig(builderData.config);
        setUsername(userData.username ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSetDomain = async () => {
    if (!domainInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDomain(data.domain);
        setVerified(false);
        toast.success("Домен установлен. Настройте DNS для верификации.");
      } else {
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/users/me/domain/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setVerified(data.verified);
        if (data.verified) {
          toast.success("Домен подтверждён!");
        } else {
          toast.info("Домен ещё не подтверждён. Проверьте DNS записи.");
        }
      } else {
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm("Remove custom domain?")) return;
    try {
      const res = await fetch("/api/users/me/domain", {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setDomain(null);
        setVerified(false);
        setDomainInput("");
        toast.success("Domain removed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано");
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Custom Domain */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Custom Domain</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Set a custom domain for your public profile page.
        </p>

        {domain ? (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{domain}</span>
              {verified ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
                  <Check className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">
                  <X className="h-3 w-3" /> Not verified
                </span>
              )}
            </div>

            {!verified && (
              <div className="rounded bg-muted p-3 text-xs space-y-3">
                <p className="font-medium">DNS-записи для настройки:</p>

                <div className="space-y-2">
                  <div className="rounded bg-background p-2">
                    <p className="mb-1 text-[10px] text-muted-foreground uppercase tracking-wide">Вариант 1: TXT запись</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="flex-1 text-[11px]">nextx-verify={username}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`nextx-verify=${username}`)}
                        className="shrink-0 rounded p-1 hover:bg-accent"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded bg-background p-2">
                    <p className="mb-1 text-[10px] text-muted-foreground uppercase tracking-wide">Вариант 2: CNAME запись</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="flex-1 text-[11px]">{domain} → nextx.app</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${domain} CNAME nextx.app`)}
                        className="shrink-0 rounded p-1 hover:bg-accent"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <Button size="sm" onClick={handleVerify} disabled={verifying} className="h-7 mt-2">
                  {verifying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                  {verifying ? "Проверка..." : "Проверить DNS"}
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Visit <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={handleRemoveDomain}
                className="text-xs text-destructive hover:underline ml-auto"
              >
                Remove domain
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="yourdomain.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSetDomain} disabled={saving}>
              {saving ? "Setting..." : "Set Domain"}
            </Button>
          </div>
        )}

        {domain && verified && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-600">
              Ваш профиль доступен по адресу: <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="underline">{domain}</a>
            </p>
          </div>
        )}
      </section>

      {/* Website Builder */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Website Builder</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Customize your public profile page with sections, themes, and custom CSS.
        </p>
        <Button onClick={() => setBuilderOpen(true)}>
          Open Builder
        </Button>
      </section>

      <BuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        initialConfig={builderConfig}
      />
    </div>
  );
}
