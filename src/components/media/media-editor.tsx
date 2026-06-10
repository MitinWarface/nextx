"use client";

import * as React from "react";
import { X, Pencil, Type, SmilePlus, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tool = "draw" | "blur" | "text" | "sticker";

interface MediaEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (blob: Blob) => void;
  imageSrc?: string;
}

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#6b7280",
];

const STICKERS = ["😀", "😂", "❤️", "🔥", "👍", "😎", "🎉", "💯", "⭐", "🚀"];

export function MediaEditor({ open, onClose, onSave, imageSrc }: MediaEditorProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = React.useState<Tool>("draw");
  const [color, setColor] = React.useState("#000000");
  const [lineWidth, setLineWidth] = React.useState(3);
  const [fontSize, setFontSize] = React.useState(24);
  const [textInput, setTextInput] = React.useState("");
  const [selectedSticker, setSelectedSticker] = React.useState("😀");
  const [isDrawing, setIsDrawing] = React.useState(false);
  const lastPoint = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!open || !imageSrc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = 600;
      const maxH = 500;
      let w = img.width;
      let h = img.height;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }
      if (h > maxH) { w = (w * maxH) / h; h = maxH; }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  const getPos = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const onPointerDown = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    if (tool === "draw") {
      setIsDrawing(true);
      lastPoint.current = pos;
    } else if (tool === "blur") {
      setIsDrawing(true);
      lastPoint.current = pos;
    } else if (tool === "text" && textInput.trim()) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = color;
        ctx.fillText(textInput, pos.x, pos.y);
      }
    } else if (tool === "sticker") {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.font = `${fontSize * 2}px serif`;
        ctx.fillText(selectedSticker, pos.x - fontSize, pos.y + fontSize);
      }
    }
  }, [tool, color, fontSize, textInput, selectedSticker, getPos]);

  const onPointerMove = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !lastPoint.current) return;
    const pos = getPos(e);

    if (tool === "draw") {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "blur") {
      const size = 18;
      const x = Math.min(lastPoint.current.x, pos.x) - size / 2;
      const y = Math.min(lastPoint.current.y, pos.y) - size / 2;
      const w = Math.abs(pos.x - lastPoint.current.x) + size;
      const h = Math.abs(pos.y - lastPoint.current.y) + size;
      if (w > 0 && h > 0) {
        const imgData = ctx.getImageData(
          Math.max(0, x), Math.max(0, y),
          Math.min(w, (canvas?.width ?? 0) - Math.max(0, x)),
          Math.min(h, (canvas?.height ?? 0) - Math.max(0, y)),
        );
        // Simple pixelation
        const pixelSize = 8;
        for (let py = 0; py < imgData.height; py += pixelSize) {
          for (let px = 0; px < imgData.width; px += pixelSize) {
            const idx = (py * imgData.width + px) * 4;
            const r = imgData.data[idx];
            const g = imgData.data[idx + 1];
            const b = imgData.data[idx + 2];
            for (let dy = 0; dy < pixelSize && py + dy < imgData.height; dy++) {
              for (let dx = 0; dx < pixelSize && px + dx < imgData.width; dx++) {
                const i = ((py + dy) * imgData.width + (px + dx)) * 4;
                imgData.data[i] = r;
                imgData.data[i + 1] = g;
                imgData.data[i + 2] = b;
              }
            }
          }
        }
        ctx.putImageData(imgData, Math.max(0, x), Math.max(0, y));
      }
    }
    lastPoint.current = pos;
  }, [isDrawing, tool, color, lineWidth, getPos]);

  const onPointerUp = React.useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  const handleSave = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  }, [onSave]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Редактор изображений</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Tool sidebar */}
          <div className="flex w-14 flex-col items-center gap-1 border-r border-border py-3">
            <ToolButton
              icon={<Pencil className="h-4 w-4" />}
              label="Карандаш"
              active={tool === "draw"}
              onClick={() => setTool("draw")}
            />
            <ToolButton
              icon={<Circle className="h-4 w-4" />}
              label="Размытие"
              active={tool === "blur"}
              onClick={() => setTool("blur")}
            />
            <ToolButton
              icon={<Type className="h-4 w-4" />}
              label="Текст"
              active={tool === "text"}
              onClick={() => setTool("text")}
            />
            <ToolButton
              icon={<SmilePlus className="h-4 w-4" />}
              label="Стикер"
              active={tool === "sticker"}
              onClick={() => setTool("sticker")}
            />
          </div>

          {/* Canvas area */}
          <div className="flex flex-1 flex-col items-center overflow-auto p-4">
            <canvas
              ref={canvasRef}
              className="max-w-full rounded-md border border-border"
              style={{ cursor: tool === "text" || tool === "sticker" ? "crosshair" : "crosshair" }}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
            />

            {/* Tool options */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(tool === "draw" || tool === "text") && (
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                        color === c ? "border-primary scale-110" : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}

              {tool === "draw" && (
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-24"
                />
              )}

              {tool === "text" && (
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Текст..."
                  className="h-8 w-40 rounded-md border border-input bg-background px-2 text-sm"
                />
              )}

              {tool === "text" && (
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-24"
                />
              )}

              {tool === "sticker" && (
                <div className="flex gap-1">
                  {STICKERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSticker(s)}
                      className={cn(
                        "text-xl transition-transform hover:scale-125",
                        selectedSticker === s && "scale-125",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave}>Применить и сохранить</Button>
        </footer>
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}
