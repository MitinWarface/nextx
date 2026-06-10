"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Hash, BookOpen, FolderKanban, Users, Plus, X, ChevronRight, Settings, ArrowLeft } from "lucide-react";

interface WorkspaceData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  ownerId: string;
  createdAt: string;
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  members: Array<{ id: string; userId: string; role: string; user: { id: string; username: string; displayName: string; avatarUrl: string | null } }>;
  channels: Array<{ id: string; name: string; description: string | null }>;
  projects: Array<{ id: string; name: string; description: string | null; status: string; tasks: Array<{ id: string; title: string; status: string; assigneeId: string | null }> }>;
  wikiPages: Array<{ id: string; title: string; content: string; author: { displayName: string } }>;
}

export default function WorkspacePage() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [workspaces, setWorkspaces] = React.useState<WorkspaceData[]>([]);
  const [selected, setSelected] = React.useState<WorkspaceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sidePanel, setSidePanel] = React.useState<"channels" | "projects" | "wiki" | "members">("channels");
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingWiki, setEditingWiki] = React.useState<{ id: string; title: string; content: string } | null>(null);

  React.useEffect(() => {
    if (userLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchWorkspaces();
  }, [user, userLoading, router]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = async (ws: WorkspaceData) => {
    const res = await fetch(`/api/workspaces/${ws.id}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setSelected(data.workspace);
    }
  };

  if (userLoading || !user) return <div className="flex h-screen items-center justify-center text-muted-foreground">Загрузка...</div>;

  // Workspace list view
  if (!selected) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Workspace</h1>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110">
              <Plus className="h-4 w-4" /> Создать
            </button>
            <button onClick={() => router.back()} className="rounded-md p-1.5 hover:bg-accent"><X className="h-5 w-5" /></button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Загрузка...</div>
          ) : workspaces.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет workspace. Создайте первый!</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {workspaces.map((ws) => (
                <button key={ws.id} onClick={() => selectWorkspace(ws)} className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-accent/50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg text-primary">
                    {ws.icon ?? "🏢"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{ws.name}</div>
                    {ws.description && <div className="text-xs text-muted-foreground line-clamp-1">{ws.description}</div>}
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{ws.members?.length ?? 0} участников</span>
                      <span>{ws.channels?.length ?? 0} каналов</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
        {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchWorkspaces(); }} />}
      </div>
    );
  }

  // Workspace detail view
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <button onClick={() => setSelected(null)} className="rounded-md p-1 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></button>
          <div className="text-sm font-semibold truncate">{selected.icon ?? "🏢"} {selected.name}</div>
        </div>

        <div className="flex-1 overflow-auto py-1">
          <SidebarItem icon={<Hash className="h-4 w-4" />} label="Каналы" active={sidePanel === "channels"} onClick={() => setSidePanel("channels")} />
          <SidebarItem icon={<FolderKanban className="h-4 w-4" />} label="Проекты" active={sidePanel === "projects"} onClick={() => setSidePanel("projects")} />
          <SidebarItem icon={<BookOpen className="h-4 w-4" />} label="Wiki" active={sidePanel === "wiki"} onClick={() => setSidePanel("wiki")} />
          <SidebarItem icon={<Users className="h-4 w-4" />} label="Участники" active={sidePanel === "members"} onClick={() => setSidePanel("members")} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4">
        {sidePanel === "channels" && (
          <ChannelsPanel workspace={selected} onUpdate={(ws) => setSelected(ws)} />
        )}
        {sidePanel === "projects" && (
          <ProjectsPanel workspace={selected} onUpdate={(ws) => setSelected(ws)} />
        )}
        {sidePanel === "wiki" && (
          <WikiPanel workspace={selected} editingWiki={editingWiki} setEditingWiki={setEditingWiki} onUpdate={(ws) => setSelected(ws)} />
        )}
        {sidePanel === "members" && (
          <MembersPanel workspace={selected} />
        )}
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors", active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
      {icon} {label}
    </button>
  );
}

function ChannelsPanel({ workspace, onUpdate }: { workspace: WorkspaceData; onUpdate: (ws: WorkspaceData) => void }) {
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const handleCreate = async () => {
    if (!newName) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ ...workspace, channels: [...workspace.channels, data.channel] });
        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Каналы</h2>
      <div className="space-y-1 mb-3">
        {workspace.channels.map((ch) => (
          <div key={ch.id} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent/50 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground" /> {ch.name}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Имя канала" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={handleCreate} disabled={creating || !newName} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
          {creating ? "..." : "Добавить"}
        </button>
      </div>
    </div>
  );
}

function ProjectsPanel({ workspace, onUpdate }: { workspace: WorkspaceData; onUpdate: (ws: WorkspaceData) => void }) {
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [expandedProject, setExpandedProject] = React.useState<string | null>(null);
  const [newTask, setNewTask] = React.useState("");

  const handleCreateProject = async () => {
    if (!newName) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ ...workspace, projects: [...workspace.projects, { ...data.project, tasks: [] }] });
        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateTask = async (projectId: string) => {
    if (!newTask) return;
    const res = await fetch(`/api/workspaces/${workspace.id}/projects`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ taskAction: "create", projectId, taskTitle: newTask }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdate({
        ...workspace,
        projects: workspace.projects.map((p) => p.id === projectId ? { ...p, tasks: [...p.tasks, data.task] } : p),
      });
      setNewTask("");
    }
  };

  const handleToggleTask = async (projectId: string, taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : currentStatus === "todo" ? "in_progress" : "done";
    await fetch(`/api/workspaces/${workspace.id}/projects`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ taskAction: "update", taskId, taskStatus: nextStatus }),
    });
    onUpdate({
      ...workspace,
      projects: workspace.projects.map((p) => p.id === projectId ? { ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: nextStatus } : t) } : p),
    });
  };

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Проекты</h2>
      <div className="space-y-2 mb-3">
        {workspace.projects.map((proj) => (
          <div key={proj.id} className="rounded-lg border border-border">
            <button onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)} className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent/50 rounded-t-lg">
              <span className="font-medium">{proj.name}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px]", proj.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground")}>{proj.status}</span>
            </button>
            {expandedProject === proj.id && (
              <div className="border-t border-border px-3 py-2 space-y-1">
                {proj.tasks.map((task) => (
                  <button key={task.id} onClick={() => handleToggleTask(proj.id, task.id, task.status)} className="flex w-full items-center gap-2 text-xs py-1 hover:bg-accent/50 rounded px-1">
                    <span className={cn("h-3 w-3 rounded-full border", task.status === "done" ? "bg-green-500 border-green-500" : task.status === "in_progress" ? "bg-amber-500 border-amber-500" : "border-muted-foreground")} />
                    <span className={task.status === "done" ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                  </button>
                ))}
                <div className="flex gap-1 pt-1">
                  <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Новая задача" className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" onKeyDown={(e) => { if (e.key === "Enter") handleCreateTask(proj.id); }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Имя проекта" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={handleCreateProject} disabled={creating || !newName} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
          {creating ? "..." : "Добавить"}
        </button>
      </div>
    </div>
  );
}

function WikiPanel({ workspace, editingWiki, setEditingWiki, onUpdate }: { workspace: WorkspaceData; editingWiki: { id: string; title: string; content: string } | null; setEditingWiki: (v: { id: string; title: string; content: string } | null) => void; onUpdate: (ws: WorkspaceData) => void }) {
  const [newTitle, setNewTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!editingWiki) return;
    setSaving(true);
    try {
      if (editingWiki.id) {
        await fetch(`/api/workspaces/${workspace.id}/wiki`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pageId: editingWiki.id, title: editingWiki.title, content: editingWiki.content }),
        });
      } else {
        const res = await fetch(`/api/workspaces/${workspace.id}/wiki`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: editingWiki.title, content: editingWiki.content }),
        });
        if (res.ok) {
          const data = await res.json();
          onUpdate({ ...workspace, wikiPages: [...workspace.wikiPages, data.page] });
        }
      }
      setEditingWiki(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle) return;
    const res = await fetch(`/api/workspaces/${workspace.id}/wiki`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: newTitle, content: "" }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdate({ ...workspace, wikiPages: [...workspace.wikiPages, data.page] });
      setNewTitle("");
      setEditingWiki({ id: data.page.id, title: data.page.title, content: data.page.content });
    }
  };

  if (editingWiki) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setEditingWiki(null)} className="rounded-md p-1 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></button>
          <input value={editingWiki.title} onChange={(e) => setEditingWiki({ ...editingWiki, title: e.target.value })} className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "..." : "Сохранить"}
          </button>
        </div>
        <textarea value={editingWiki.content} onChange={(e) => setEditingWiki({ ...editingWiki, content: e.target.value })} className="w-full h-[60vh] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Wiki</h2>
      <div className="space-y-1 mb-3">
        {workspace.wikiPages.map((page) => (
          <button key={page.id} onClick={() => setEditingWiki({ id: page.id, title: page.title, content: page.content })} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-accent/50">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{page.title}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{page.author.displayName}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Новая страница" className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={handleCreate} disabled={!newTitle} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
          Добавить
        </button>
      </div>
    </div>
  );
}

function MembersPanel({ workspace }: { workspace: WorkspaceData }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Участники ({workspace.members.length})</h2>
      <div className="space-y-1">
        {workspace.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {m.user.displayName?.[0] ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{m.user.displayName}</div>
              <div className="text-[10px] text-muted-foreground">@{m.user.username}</div>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px]", m.role === "owner" ? "bg-primary/10 text-primary" : m.role === "admin" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground")}>
              {m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateWorkspaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description: description || null }),
      });
      if (res.ok) onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex w-full max-w-sm flex-col rounded-lg border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold">Новый Workspace</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название" className="mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" className="mb-3 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring h-16 resize-none" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">Отмена</button>
          <button onClick={handleSave} disabled={saving || !name} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {saving ? "..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}
