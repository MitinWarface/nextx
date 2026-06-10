"use client";

import * as React from "react";

/**
 * Detects timecodes like 12:34, 1:23:45, or 00:00:00 in text and makes them clickable.
 * Returns React nodes with clickable timecode spans.
 */
export function renderTimecodes(
  text: string,
  onTimecodeClick?: (seconds: number) => void,
): React.ReactNode[] {
  if (!onTimecodeClick) return [text];

  const parts: React.ReactNode[] = [];
  // Match HH:MM:SS, MM:SS, or H:MM:SS patterns
  const regex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const timecode = match[1];
    const segments = timecode.split(":").map(Number);

    let totalSeconds = 0;
    if (segments.length === 3) {
      totalSeconds = segments[0] * 3600 + segments[1] * 60 + segments[2];
    } else if (segments.length === 2) {
      totalSeconds = segments[0] * 60 + segments[1];
    }

    if (totalSeconds > 0) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <TimecodeChip
          key={`tc-${match.index}`}
          timecode={timecode}
          seconds={totalSeconds}
          onClick={onTimecodeClick}
        />,
      );
      lastIndex = match.index + timecode.length;
    }
  }

  if (parts.length === 0) return [text];
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function TimecodeChip({
  timecode,
  seconds,
  onClick,
}: {
  timecode: string;
  seconds: number;
  onClick: (seconds: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(seconds);
      }}
      className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 font-mono text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 hover:underline"
      title={`Перейти к ${timecode}`}
    >
      {timecode}
    </button>
  );
}
