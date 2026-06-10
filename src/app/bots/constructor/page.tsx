"use client";

import * as React from "react";
import {
  Bot,
  Plus,
  Save,
  Play,
  Square,
  Trash2,
  MessageSquare,
  MousePointerClick,
  GitBranch,
  Command,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/store/toast-store";

interface FlowNode {
  id: string;
  type: "command" | "message" | "button" | "condition";
  x: number;
  y: number;
  data: {
    label: string;
    content?: string;
    options?: string[];
    condition?: string;
  };
}

interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface BotFlow {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const NODE_TYPES = [
  { type: "command" as const, label: "Command", icon: Command, color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { type: "message" as const, label: "Message", icon: MessageSquare, color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { type: "button" as const, label: "Button", icon: MousePointerClick, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { type: "condition" as const, label: "Condition", icon: GitBranch, color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
];

export default function BotConstructorPage() {
  const [flow, setFlow] = React.useState<BotFlow>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [draggedType, setDraggedType] = React.useState<string | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [testInput, setTestInput] = React.useState("");
  const [testOutput, setTestOutput] = React.useState<string[]>([]);
  const [testState, setTestState] = React.useState<{ currentNodeId: string | null; history: string[] }>({
    currentNodeId: null,
    history: [],
  });
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const addNode = (type: FlowNode["type"], x: number, y: number) => {
    const id = `node-${Date.now()}`;
    const node: FlowNode = {
      id,
      type,
      x,
      y,
      data: {
        label: NODE_TYPES.find((n) => n.type === type)?.label ?? type,
        content: "",
        options: type === "button" ? ["Option 1", "Option 2"] : undefined,
        condition: type === "condition" ? "" : undefined,
      },
    };
    setFlow((prev) => ({ ...prev, nodes: [...prev.nodes, node] }));
    setSelectedNode(id);
  };

  const updateNode = (id: string, data: Partial<FlowNode["data"]>) => {
    setFlow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    }));
  };

  const deleteNode = (id: string) => {
    setFlow((prev) => ({
      nodes: prev.nodes.filter((n) => n.id !== id),
      edges: prev.edges.filter((e) => e.from !== id && e.to !== id),
    }));
    if (selectedNode === id) setSelectedNode(null);
  };

  const addEdge = (from: string, to: string, label?: string) => {
    const id = `edge-${Date.now()}`;
    setFlow((prev) => ({
      ...prev,
      edges: [...prev.edges.filter((e) => !(e.from === from && e.to === to)), { id, from, to, label }],
    }));
  };

  const deleteEdge = (id: string) => {
    setFlow((prev) => ({ ...prev, edges: prev.edges.filter((e) => e.id !== id) }));
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedType) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addNode(draggedType as FlowNode["type"], x, y);
    setDraggedType(null);
  };

  const [botId, setBotId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBotId(params.get("botId"));
  }, []);

  const saveFlow = async () => {
    try {
      if (!botId) {
        toast.error("No bot selected");
        return;
      }
      const res = await fetch(`/api/bots/${botId}/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ flow }),
      });
      if (res.ok) {
        toast.success("Flow saved");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const loadFlow = async () => {
    try {
      if (!botId) return;
      const res = await fetch(`/api/bots/${botId}/flow`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.flow) {
          setFlow(data.flow);
          toast.success("Flow loaded");
        }
      }
    } catch {
      toast.error("Failed to load flow");
    }
  };

  React.useEffect(() => {
    if (botId) loadFlow();
  }, [botId]);

  const startTest = () => {
    setIsRunning(true);
    setTestOutput([]);
    setTestState({ currentNodeId: null, history: [] });
    toast.success("Test mode started");
  };

  const stopTest = () => {
    setIsRunning(false);
    setTestInput("");
    toast.info("Test mode stopped");
  };

  const handleTestInput = () => {
    if (!testInput.trim()) return;

    const input = testInput.trim().toLowerCase();
    setTestInput("");
    setTestOutput((prev) => [...prev, `User: ${input}`]);

    if (flow.nodes.length === 0) {
      setTestOutput((prev) => [...prev, "Bot: No flow configured"]);
      return;
    }

    let currentNode = flow.nodes.find((n) => {
      if (n.type === "command") {
        return n.data.label.toLowerCase().includes(input) || input.startsWith(`/${n.data.label.toLowerCase()}`);
      }
      return false;
    });

    if (!currentNode) {
      currentNode = flow.nodes[0];
    }

    if (currentNode) {
      const respond = (msg: string) => {
        setTestOutput((prev) => [...prev, `Bot: ${msg}`]);
      };

      if (currentNode.type === "message") {
        respond(currentNode.data.content || "Empty message");
      } else if (currentNode.type === "command") {
        respond(currentNode.data.content || `Command "${currentNode.data.label}" executed`);
      } else if (currentNode.type === "button") {
        respond(`Choose: ${currentNode.data.options?.join(", ") ?? "No options"}`);
      } else if (currentNode.type === "condition") {
        respond(`Checking condition: ${currentNode.data.condition || "..."}`);
      }
    }
  };

  const selectedNodeData = flow.nodes.find((n) => n.id === selectedNode);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Bot Constructor</h1>
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={stopTest}
              className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
            >
              <Square className="h-4 w-4" />
              Stop Test
            </button>
          ) : (
            <button
              type="button"
              onClick={startTest}
              className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20"
            >
              <Play className="h-4 w-4" />
              Test
            </button>
          )}
          <button
            type="button"
            onClick={saveFlow}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_250px]">
        {/* Node Palette */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Nodes</h3>
          <div className="space-y-2">
            {NODE_TYPES.map((nt) => {
              const Icon = nt.icon;
              return (
                <div
                  key={nt.type}
                  draggable
                  onDragStart={() => setDraggedType(nt.type)}
                  onDragEnd={() => setDraggedType(null)}
                  className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-grab active:cursor-grabbing ${nt.color}`}
                >
                  <Icon className="h-4 w-4" />
                  {nt.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div className="relative rounded-lg border border-border bg-muted/30 overflow-hidden" style={{ minHeight: 500 }}>
          <div
            ref={canvasRef}
            className="absolute inset-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            {/* Edges */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none">
              {flow.edges.map((edge) => {
                const from = flow.nodes.find((n) => n.id === edge.from);
                const to = flow.nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <g key={edge.id}>
                    <line
                      x1={from.x + 60}
                      y1={from.y + 20}
                      x2={to.x + 60}
                      y2={to.y + 20}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-border"
                    />
                    {edge.label && (
                      <text
                        x={(from.x + to.x) / 2 + 60}
                        y={(from.y + to.y) / 2 + 20}
                        className="fill-muted-foreground text-[10px]"
                        textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {flow.nodes.map((node) => {
              const nt = NODE_TYPES.find((n) => n.type === node.type);
              const Icon = nt?.icon ?? Command;
              return (
                <div
                  key={node.id}
                  className={`absolute flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${nt?.color ?? ""} ${
                    selectedNode === node.id ? "ring-2 ring-primary" : ""
                  }`}
                  style={{ left: node.x, top: node.y, minWidth: 120 }}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{node.data.label}</span>
                </div>
              );
            })}

            {flow.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Drag nodes from the palette to build your bot flow
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Properties</h3>
          {selectedNodeData ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Label</label>
                <Input
                  value={selectedNodeData.data.label}
                  onChange={(e) => updateNode(selectedNodeData.id, { label: e.target.value })}
                />
              </div>
              {(selectedNodeData.type === "message" || selectedNodeData.type === "command") && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Content</label>
                  <textarea
                    value={selectedNodeData.data.content ?? ""}
                    onChange={(e) => updateNode(selectedNodeData.id, { content: e.target.value })}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm min-h-[80px]"
                  />
                </div>
              )}
              {selectedNodeData.type === "button" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Options (one per line)</label>
                  <textarea
                    value={selectedNodeData.data.options?.join("\n") ?? ""}
                    onChange={(e) => updateNode(selectedNodeData.id, { options: e.target.value.split("\n").filter(Boolean) })}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm min-h-[80px]"
                  />
                </div>
              )}
              {selectedNodeData.type === "condition" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
                  <Input
                    value={selectedNodeData.data.condition ?? ""}
                    onChange={(e) => updateNode(selectedNodeData.id, { condition: e.target.value })}
                    placeholder="e.g. user.role == 'admin'"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Connect to</label>
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addEdge(selectedNodeData.id, e.target.value);
                    }
                  }}
                >
                  <option value="">Select node...</option>
                  {flow.nodes
                    .filter((n) => n.id !== selectedNodeData.id)
                    .map((n) => (
                      <option key={n.id} value={n.id}>{n.data.label}</option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => deleteNode(selectedNodeData.id)}
                  className="flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select a node to edit its properties</p>
          )}

          {/* Edges list */}
          {flow.edges.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="mb-2 text-xs font-semibold">Connections</h4>
              <div className="space-y-1">
                {flow.edges.map((edge) => {
                  const from = flow.nodes.find((n) => n.id === edge.from);
                  const to = flow.nodes.find((n) => n.id === edge.to);
                  return (
                    <div key={edge.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {from?.data.label} → {to?.data.label}
                      </span>
                      <button type="button" onClick={() => deleteEdge(edge.id)} className="text-muted-foreground hover:text-red-400">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Console */}
      {isRunning && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Test Console</h3>
          <div className="mb-3 max-h-48 overflow-y-auto rounded-md bg-muted/30 p-3 font-mono text-xs">
            {testOutput.length === 0 ? (
              <span className="text-muted-foreground">Type a command to test the bot...</span>
            ) : (
              testOutput.map((line, i) => (
                <div key={i} className={line.startsWith("User:") ? "text-primary" : "text-emerald-400"}>
                  {line}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTestInput()}
              placeholder="Type a message or command..."
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleTestInput}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
