"use client";

import * as React from "react";
import { RotateCw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface SpinData {
  canSpin: boolean;
  lastReward: { reward: string; amount: number } | null;
  totalSpins: number;
  rewards: { label: string; amount: number }[];
}

interface SpinResult {
  reward: string;
  amount: number;
  newBalance: number;
}

const SEGMENT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7",
];

interface SpinWheelProps {
  open: boolean;
  onClose: () => void;
}

export function SpinWheel({ open, onClose }: SpinWheelProps) {
  const [data, setData] = React.useState<SpinData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState<SpinResult | null>(null);
  const [rotation, setRotation] = React.useState(0);
  const wheelRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/spin", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { if (open) load(); }, [open, load]);

  const handleSpin = async () => {
    if (!data?.canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const rewards = data.rewards;
    const targetIndex = Math.floor(Math.random() * rewards.length);
    const segmentAngle = 360 / rewards.length;
    const targetAngle = 360 - targetIndex * segmentAngle;
    const totalRotation = rotation + 360 * 5 + targetAngle;

    setRotation(totalRotation);

    try {
      const res = await fetch("/api/users/me/spin", {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (res.ok) {
        setTimeout(() => {
          setResult(d);
          setSpinning(false);
          load();
        }, 3200);
      } else {
        toast.error(d.error === "already_spun_today" ? "Вы уже крутили сегодня" : "Ошибка");
        setSpinning(false);
      }
    } catch {
      toast.error("Ошибка сети");
      setSpinning(false);
    }
  };

  if (!open) return null;

  const rewards = data?.rewards ?? [];
  const segmentAngle = rewards.length > 0 ? 360 / rewards.length : 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-center">
          <h2 className="text-lg font-bold">Ежедневный спин</h2>
          <p className="text-xs text-muted-foreground">Крутите колесо раз в день!</p>
        </div>

        {data?.lastReward && !result && (
          <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-2 text-center text-xs text-primary">
            Сегодня вы уже получили: {data.lastReward.reward}
          </div>
        )}

        <div className="relative mx-auto mb-4 flex items-center justify-center">
          {/* Pointer */}
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
            <div className="h-0 w-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-primary" />
          </div>

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="h-52 w-52 rounded-full border-4 border-primary/30 shadow-lg"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 3.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
            }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full">
              {rewards.map((r, i) => {
                const startAngle = (i * segmentAngle * Math.PI) / 180;
                const endAngle = ((i + 1) * segmentAngle * Math.PI) / 180;
                const x1 = 100 + 90 * Math.cos(startAngle);
                const y1 = 100 + 90 * Math.sin(startAngle);
                const x2 = 100 + 90 * Math.cos(endAngle);
                const y2 = 100 + 90 * Math.sin(endAngle);
                const midAngle = ((i + 0.5) * segmentAngle * Math.PI) / 180;
                const tx = 100 + 55 * Math.cos(midAngle);
                const ty = 100 + 55 * Math.sin(midAngle);

                return (
                  <g key={i}>
                    <path
                      d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`}
                      fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      style={{ transform: `rotate(${(i + 0.5) * segmentAngle}deg)`, transformOrigin: `${tx}px ${ty}px` }}
                    >
                      {r.label}
                    </text>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="18" fill="white" stroke="hsl(var(--primary))" strokeWidth="3" />
            </svg>
          </div>
        </div>

        {result && (
          <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-center">
            <Trophy className="mx-auto mb-1 h-6 w-6 text-green-500" />
            <p className="text-sm font-bold text-green-600">{result.reward}</p>
            <p className="text-xs text-muted-foreground">Баланс: {result.newBalance} NC</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSpin}
          disabled={!data?.canSpin || spinning}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-colors",
            data?.canSpin && !spinning
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          <RotateCw className={cn("h-4 w-4", spinning && "animate-spin")} />
          {spinning ? "Крутится..." : data?.canSpin ? "Крутить!" : "Завтра снова"}
        </button>

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Всего спинов: {data?.totalSpins ?? 0}
        </p>
      </div>
    </div>
  );
}
