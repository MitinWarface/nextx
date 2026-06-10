"use client";

import * as React from "react";
import { X, Plus, GripVertical, Trash2, Calendar, User } from "lucide-react";
import { toast } from "@/store/toast-store";

interface KanbanTask {
  id: string;
  chatId: string;
  title: string;
  description: string | null;
  column: string;
  position: number;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
}

interface KanbanBoardProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
}

const COLUMNS = [
  { id: "todo", label: "К выполнению", color: "bg-gray-500" },
  { id: "in_progress", label: "В работе", color: "bg-blue-500" },
  { id: "review", label: "Ревью", color: "bg-yellow-500" },
  { id: "done", label: "Готово", color: "bg-green-500" },
] as const;

export function KanbanBoard({ open, onClose, chatId }: KanbanBoardProps) {
  const [tasks, setTasks] = React.useState<KanbanTask[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newColumn, setNewColumn] = React.useState("todo");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");

  const fetchTasks = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kanban?chatId=${chatId}`, { credentials: "include" });
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } catch {} finally { setLoading(false); }
  }, [chatId]);

  React.useEffect(() => { if (open) fetchTasks(); }, [open, fetchTasks]);

  const handleCreate = async () => {
    if (!newTitle.trim()) { toast.error("Введите заголовок"); return; }
    try {
      const res = await fetch("/api/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chatId, title: newTitle, column: newColumn }),
      });
      if (res.ok) {
        setNewTitle(""); setCreating(false);
        fetchTasks();
      }
    } catch { toast.error("Ошибка"); }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await fetch(`/api/kanban/${taskId}`, { method: "DELETE", credentials: "include" });
      fetchTasks();
    } catch { toast.error("Ошибка удаления"); }
  };

  const handleUpdate = async (taskId: string, data: Partial<KanbanTask>) => {
    try {
      await fetch(`/api/kanban/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      fetchTasks();
    } catch { toast.error("Ошибка обновления"); }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedId) {
      handleUpdate(draggedId, { column: colId });
    }
    setDraggedId(null);
    setDragOverCol(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverCol(null);
  };

  const startEdit = (task: KanbanTask) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
  };

  const saveEdit = (taskId: string) => {
    handleUpdate(taskId, { title: editTitle, description: editDesc });
    setEditingId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-lg border border-border bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Kanban Доска</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-3 flex items-center gap-2 px-4 pt-3">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="Новая задача..." className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
          <select value={newColumn} onChange={(e) => setNewColumn(e.target.value)} className="rounded-md border border-input bg-transparent px-2 py-2 text-sm">
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button type="button" onClick={handleCreate} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 gap-3 overflow-x-auto p-4 pt-0">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id).sort((a, b) => a.position - b.position);
            return (
              <div
                key={col.id}
                className={`flex w-64 flex-shrink-0 flex-col rounded-lg border border-border bg-muted/30 p-3 transition-colors ${dragOverCol === col.id ? "border-primary" : ""}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{colTasks.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`group cursor-grab rounded-md border border-border bg-background p-3 transition-shadow hover:shadow-md ${draggedId === task.id ? "opacity-50" : ""}`}
                    >
                      {editingId === task.id ? (
                        <div>
                          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mb-1 w-full rounded border border-input bg-transparent px-2 py-1 text-sm" />
                          <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="mb-1 w-full rounded border border-input bg-transparent px-2 py-1 text-xs resize-none" />
                          <div className="flex gap-1">
                            <button type="button" onClick={() => saveEdit(task.id)} className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">OK</button>
                            <button type="button" onClick={() => setEditingId(null)} className="rounded bg-muted px-2 py-0.5 text-xs">Отмена</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => startEdit(task)}>
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium">{task.title}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                          {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
                          {task.dueDate && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
