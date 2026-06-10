"use client";

import * as React from "react";

interface CountdownWidgetProps {
  targetAt: string;
  title: string;
  color?: string;
  compact?: boolean;
}

export function CountdownWidget({ targetAt, title, color, compact }: CountdownWidgetProps) {
  const [timeLeft, setTimeLeft] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = React.useState(false);

  React.useEffect(() => {
    const target = new Date(targetAt).getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetAt]);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const textColor = color ?? "text-primary";

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className={`flex items-center gap-1 font-mono text-sm font-bold ${textColor}`}>
          {expired ? (
            <span className="text-emerald-400">Done!</span>
          ) : (
            <>
              {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
              <span>{pad(timeLeft.hours)}h</span>
              <span>{pad(timeLeft.minutes)}m</span>
              <span>{pad(timeLeft.seconds)}s</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-sm font-medium">{title}</p>
      {expired ? (
        <p className="text-lg font-bold text-emerald-400">Completed!</p>
      ) : (
        <div className="flex gap-3">
          {[
            { value: timeLeft.days, label: "Days" },
            { value: timeLeft.hours, label: "Hours" },
            { value: timeLeft.minutes, label: "Min" },
            { value: timeLeft.seconds, label: "Sec" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-md bg-muted font-mono text-lg font-bold ${textColor}`}>
                {pad(item.value)}
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
