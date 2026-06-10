"use client";

import * as React from "react";
import {
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
  Plus,
  Globe,
  Link,
  Image,
  Code,
  User,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface BuilderSection {
  type: string;
  enabled: boolean;
  title?: string;
  content?: string;
  items?: Array<{ label: string; url: string }>;
}

interface BuilderConfig {
  sections: BuilderSection[];
  theme: string;
  customCss: string;
}

interface BuilderModalProps {
  open: boolean;
  onClose: () => void;
  initialConfig?: BuilderConfig | null;
}

const SECTION_TYPES = [
  { type: "about", label: "About", icon: User, defaultTitle: "About Me" },
  { type: "links", label: "Links", icon: Link, defaultTitle: "My Links" },
  { type: "gallery", label: "Gallery", icon: Image, defaultTitle: "Gallery" },
  { type: "skills", label: "Skills", icon: Code, defaultTitle: "Skills" },
  { type: "contact", label: "Contact", icon: Mail, defaultTitle: "Contact" },
];

const DEFAULT_CONFIG: BuilderConfig = {
  sections: [
    { type: "about", enabled: true, title: "About Me", content: "" },
    { type: "links", enabled: true, title: "My Links", items: [] },
  ],
  theme: "default",
  customCss: "",
};

export function BuilderModal({ open, onClose, initialConfig }: BuilderModalProps) {
  const [config, setConfig] = React.useState<BuilderConfig>(initialConfig ?? DEFAULT_CONFIG);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"sections" | "style">("sections");

  React.useEffect(() => {
    if (initialConfig) setConfig(initialConfig);
  }, [initialConfig]);

  if (!open) return null;

  const toggleSection = (type: string) => {
    setConfig((prev) => {
      const exists = prev.sections.find((s) => s.type === type);
      if (exists) {
        return {
          ...prev,
          sections: prev.sections.map((s) =>
            s.type === type ? { ...s, enabled: !s.enabled } : s
          ),
        };
      }
      const meta = SECTION_TYPES.find((st) => st.type === type);
      return {
        ...prev,
        sections: [
          ...prev.sections,
          { type, enabled: true, title: meta?.defaultTitle ?? type, content: "", items: [] },
        ],
      };
    });
  };

  const updateSection = (type: string, updates: Partial<BuilderSection>) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.type === type ? { ...s, ...updates } : s
      ),
    }));
  };

  const removeSection = (type: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.type !== type),
    }));
  };

  const addLink = (type: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.type === type
          ? { ...s, items: [...(s.items ?? []), { label: "", url: "" }] }
          : s
      ),
    }));
  };

  const updateLink = (type: string, index: number, updates: { label?: string; url?: string }) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.type === type
          ? { ...s, items: s.items?.map((item, i) => (i === index ? { ...item, ...updates } : item)) }
          : s
      ),
    }));
  };

  const removeLink = (type: string, index: number) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.type === type
          ? { ...s, items: s.items?.filter((_, i) => i !== index) }
          : s
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/builder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ config }),
      });
      if (res.ok) {
        toast.success("Saved");
        onClose();
      } else {
        toast.error("Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg border border-border w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" /> Website Builder
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>

        <div className="flex border-b border-border">
          <button type="button" onClick={() => setActiveTab("sections")} className={`px-4 py-2 text-sm ${activeTab === "sections" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Sections
          </button>
          <button type="button" onClick={() => setActiveTab("style")} className={`px-4 py-2 text-sm ${activeTab === "style" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            Style
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "sections" && (
            <>
              <p className="text-xs text-muted-foreground">Toggle sections on/off and edit their content.</p>

              {SECTION_TYPES.map((st) => {
                const section = config.sections.find((s) => s.type === st.type);
                const enabled = section?.enabled ?? false;
                const Icon = st.icon;
                return (
                  <div key={st.type} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{st.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {section && (
                          <button type="button" onClick={() => removeSection(st.type)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleSection(st.type)}
                          className={`rounded-full p-1 ${enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {enabled && section && (
                      <div className="space-y-2 pl-6">
                        <Input
                          placeholder="Section title"
                          value={section.title ?? ""}
                          onChange={(e) => updateSection(st.type, { title: e.target.value })}
                          className="h-8 text-xs"
                        />
                        {(st.type === "about" || st.type === "skills" || st.type === "contact") && (
                          <textarea
                            placeholder="Content..."
                            value={section.content ?? ""}
                            onChange={(e) => updateSection(st.type, { content: e.target.value })}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs min-h-[80px] resize-y"
                          />
                        )}
                        {st.type === "links" && (
                          <div className="space-y-2">
                            {(section.items ?? []).map((item, i) => (
                              <div key={i} className="flex gap-2">
                                <Input
                                  placeholder="Label"
                                  value={item.label}
                                  onChange={(e) => updateLink(st.type, i, { label: e.target.value })}
                                  className="h-7 text-xs flex-1"
                                />
                                <Input
                                  placeholder="URL"
                                  value={item.url}
                                  onChange={(e) => updateLink(st.type, i, { url: e.target.value })}
                                  className="h-7 text-xs flex-1"
                                />
                                <button type="button" onClick={() => removeLink(st.type, i)} className="text-muted-foreground hover:text-destructive p-1">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addLink(st.type)}>
                              <Plus className="h-3 w-3" /> Add Link
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {activeTab === "style" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Theme</label>
                <select
                  value={config.theme}
                  onChange={(e) => setConfig((prev) => ({ ...prev, theme: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="default">Default</option>
                  <option value="minimal">Minimal</option>
                  <option value="bold">Bold</option>
                  <option value="gradient">Gradient</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom CSS</label>
                <textarea
                  value={config.customCss}
                  onChange={(e) => setConfig((prev) => ({ ...prev, customCss: e.target.value }))}
                  placeholder=".profile { color: red; }"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs min-h-[120px] font-mono resize-y"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
