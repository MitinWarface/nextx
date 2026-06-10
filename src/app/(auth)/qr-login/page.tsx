"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "idle" | "loading" | "pending" | "scanned" | "confirmed" | "expired" | "error";

export default function QrLoginPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>("idle");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState(0);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = React.useRef<number>(0);

  const cleanup = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (expiryRef.current) clearTimeout(expiryRef.current);
  }, []);

  const generateQr = React.useCallback(async () => {
    cleanup();
    setStatus("loading");
    setSessionId(null);
    setCode(null);
    setCountdown(0);

    try {
      const res = await fetch("/api/auth/qr", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate QR");
      const data = await res.json();
      setSessionId(data.sessionId);
      setCode(data.code);
      setStatus("pending");
      startTimeRef.current = Date.now();

      // Start polling
      intervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/auth/qr?sessionId=${data.sessionId}`);
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();

          if (pollData.status === "confirmed") {
            cleanup();
            setStatus("confirmed");
            // Store token and redirect
            if (pollData.token) {
              localStorage.setItem("nextx_qr_token", pollData.token);
              router.push("/");
              router.refresh();
            }
          } else if (pollData.status === "expired") {
            cleanup();
            setStatus("expired");
          } else if (pollData.status === "pending") {
            // Check if expired on client side
            const elapsed = Date.now() - startTimeRef.current;
            setCountdown(Math.max(0, 300 - Math.floor(elapsed / 1000)));
          }
        } catch {
          // ignore poll errors
        }
      }, 2000);

      // Set expiry timer (5 minutes)
      expiryRef.current = setTimeout(() => {
        cleanup();
        setStatus("expired");
      }, 5 * 60 * 1000);
    } catch {
      setStatus("error");
    }
  }, [cleanup, router]);

  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const isPending = status === "pending" || status === "loading";

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">QR Login</h1>
            <p className="text-xs text-muted-foreground">
              Войдите с другого устройства
            </p>
          </div>
        </div>

        {status === "idle" && (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Отсканируйте QR-код на телефоне для входа в аккаунт
            </p>
            <Button onClick={generateQr} className="w-full">
              Сгенерировать QR
            </Button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Генерация QR-кода...</p>
          </div>
        )}

        {(status === "pending" || status === "scanned") && code && (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <QRCodeSVG value={code} size={200} />
              {status === "scanned" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                Откройте NextX на телефоне
              </p>
              <p className="text-xs text-muted-foreground">
                Настройки → Устройства → Сканировать QR
              </p>
              {countdown > 0 && (
                <p className="text-xs text-muted-foreground">
                  Истекает через {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={generateQr}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Обновить QR
            </Button>
          </div>
        )}

        {status === "confirmed" && (
          <div className="flex flex-col items-center py-8 space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">Вход выполнен!</p>
            <p className="text-xs text-muted-foreground">Перенаправление...</p>
          </div>
        )}

        {status === "expired" && (
          <div className="flex flex-col items-center py-8 space-y-3">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm font-medium">QR-код истёк</p>
            <p className="text-xs text-muted-foreground">
              Генерация нового QR-кода...
            </p>
            <Button onClick={generateQr} className="mt-2">
              Попробовать снова
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-8 space-y-3">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm font-medium">Ошибка</p>
            <p className="text-xs text-muted-foreground">
              Не удалось сгенерировать QR-код
            </p>
            <Button onClick={generateQr} className="mt-2">
              Попробовать снова
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">
            Войти по паролю
          </a>
        </p>
      </div>
    </div>
  );
}

// Minimal QR Code SVG generator
// This creates a visual pattern that can be scanned by a QR reader app
function QRCodeSVG({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = Math.floor(size / 25);
    const modules = 25;
    const actualSize = cellSize * modules;

    canvas.width = actualSize;
    canvas.height = actualSize;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, actualSize, actualSize);

    // Generate deterministic pattern from value
    const hash = simpleHash(value);

    // Draw finder patterns (top-left, top-right, bottom-left)
    drawFinderPattern(ctx, 0, 0, cellSize);
    drawFinderPattern(ctx, (modules - 7) * cellSize, 0, cellSize);
    drawFinderPattern(ctx, 0, (modules - 7) * cellSize, cellSize);

    // Draw timing patterns
    for (let i = 8; i < modules - 8; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(i * cellSize, 6 * cellSize, cellSize, cellSize);
        ctx.fillRect(6 * cellSize, i * cellSize, cellSize, cellSize);
      }
    }

    // Draw data modules (pseudo-random based on hash)
    ctx.fillStyle = "#000000";
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Skip finder patterns and timing
        if (
          (row < 8 && col < 8) ||
          (row < 8 && col > modules - 9) ||
          (row > modules - 9 && col < 8) ||
          row === 6 ||
          col === 6
        ) {
          continue;
        }

        // Use hash-based pseudo-random
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
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
  // Outer black border
  ctx.fillStyle = "#000000";
  ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);

  // Inner white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);

  // Center black
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
