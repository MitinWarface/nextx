"use client";

import { useState } from "react";

export function SpoilerText({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      className={`spoiler ${revealed ? "revealed" : ""}`}
      onClick={() => setRevealed(!revealed)}
    >
      {children}
    </span>
  );
}
