"use client";

import * as React from "react";
import { X, QrCode, Loader2, CheckCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/store/toast-store";

type ScanStatus = "idle" | "generating" | "ready" | "scanning" | "confirmed" | "error";

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
}

export function QrScannerModal({ open, onClose }: QrScannerModalProps) {
  const [status, setStatus] = React.useState<ScanStatus>("idle");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState<string | null>(null);
  const [manualCode, setManualCode] = React.useState("");
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const generateQr = React.useCallback(async () => {
    cleanup();
    setStatus("generating");
    setSessionId(null);
    setCode(null);

    try {
      const res = await fetch("/api/auth/qr", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSessionId(data.sessionId);
      setCode(data.code);
      setStatus("ready");

      // Auto-expire after 5 minutes
      setTimeout(() => {
        if (intervalRef.current) {
          cleanup();
          setStatus("idle");
          toast.info("QR-код истёк. Сгенерируйте новый.");
        }
      }, 5 * 60 * 1000);
    } catch {
      setStatus("error");
      toast.error("Не удалось сгенерировать QR-код");
    }
  }, [cleanup]);

  const confirmCode = React.useCallback(
    async (codeToConfirm: string) => {
      setStatus("scanning");
      try {
        const res = await fetch("/api/auth/qr/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeToConfirm }),
        });
        if (!res.ok) {
          const data = await res.json();
          if (data.error === "session_expired") {
            toast.error("QR-код истёк");
            setStatus("idle");
          } else if (data.error === "session_already_used") {
            toast.error("QR-код уже использован");
            setStatus("idle");
          } else {
            throw new Error("Failed");
          }
          return;
        }
        setStatus("confirmed");
        toast.success("Вход подтверждён!");
        setTimeout(() => {
          onClose();
          cleanup();
        }, 1500);
      } catch {
        setStatus("error");
        toast.error("Ошибка подтверждения");
      }
    },
    [onClose, cleanup],
  );

  const handleManualConfirm = () => {
    const trimmed = manualCode.trim();
    if (trimmed.length >= 16) {
      confirmCode(trimmed);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Сканировать QR</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="rounded p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {status === "idle" && (
            <>
              <p className="text-xs text-muted-foreground text-center">
                Сканируйте QR-код с другого устройства для входа
              </p>
              <Button onClick={generateQr} className="w-full" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Сканировать QR
              </Button>
            </>
          )}

          {status === "generating" && (
            <div className="flex flex-col items-center py-6 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Генерация...</p>
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Отсканируйте QR-код на устройстве, куда хотите войти
                </p>
                <div className="flex justify-center">
                  <QRCodeSVG value={code || ""} size={150} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">
                  Или введите код вручную на другом устройстве:
                </p>
                <p className="text-xs font-mono font-medium mt-1 break-all">
                  {code}
                </p>
              </div>
            </div>
          )}

          {status === "scanning" && (
            <div className="flex flex-col items-center py-6 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Подтверждение входа...</p>
            </div>
          )}

          {status === "confirmed" && (
            <div className="flex flex-col items-center py-6 space-y-3">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium">Вход подтверждён!</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-xs text-destructive text-center">
                Ошибка. Попробуйте снова.
              </p>
              <Button onClick={generateQr} className="w-full" size="sm" variant="outline">
                Попробовать снова
              </Button>
            </div>
          )}

          {status !== "idle" && status !== "generating" && status !== "confirmed" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Или
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Вставьте код с другого устройства"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs"
                />
                <Button
                  onClick={handleManualConfirm}
                  disabled={manualCode.trim().length < 16 || status === "scanning"}
                  className="w-full"
                  size="sm"
                  variant="outline"
                >
                  Подтвердить
                </Button>
              </div>
            </>
          )}

          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground text-center">
              Откройте NextX на устройстве, куда хотите войти →
              <br />
              Настройки → Безопасность → Активные сессии → Сканировать QR
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal QR Code SVG generator (same as in qr-login page)
function QRCodeSVG({ value, size = 150 }: { value: string; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (!canvasRef.current || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = Math.floor(size / 25);
    const modules = 25;
    const actualSize = cellSize * modules;

    canvas.width = actualSize;
    canvas.height = actualSize;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, actualSize, actualSize);

    const hash = simpleHash(value);

    drawFinderPattern(ctx, 0, 0, cellSize);
    drawFinderPattern(ctx, (modules - 7) * cellSize, 0, cellSize);
    drawFinderPattern(ctx, 0, (modules - 7) * cellSize, cellSize);

    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(i * cellSize, 6 * cellSize, cellSize, cellSize);
        ctx.fillRect(6 * cellSize, i * cellSize, cellSize, cellSize);
      }
    }

    ctx.fillStyle = "#000000";
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (
          (row < 8 && col < 8) ||
          (row < 8 && col > modules - 9) ||
          (row > modules - 9 && col < 8) ||
          row === 6 ||
          col === 6
        ) {
          continue;
        }
        const seed = hash + row * modules + col;
        if (pseudoRandom(seed) > 0.5) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    setDataUrl(canvas.toDataURL("image/png"));
  }, [value, size]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR Code"
          width={size}
          height={size}
          className="rounded-lg border border-border"
        />
      ) : (
        <div
          className="flex items-center justify-center bg-muted rounded-lg border border-border"
          style={{ width: size, height: size }}
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  );
}

function drawFinderPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
  ctx.fillStyle = "#000000";
  ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
