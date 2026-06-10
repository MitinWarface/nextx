"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Segment =
  | { type: "text"; content: string }
  | { type: "bold"; children: Segment[] }
  | { type: "italic"; children: Segment[] }
  | { type: "underline"; children: Segment[] }
  | { type: "strikethrough"; children: Segment[] }
  | { type: "spoiler"; children: Segment[] }
  | { type: "quote"; children: Segment[] }
  | { type: "code"; content: string }
  | { type: "codeblock"; content: string; lang?: string };

function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code ```...``` first (greedy)
    const cbMatch = remaining.match(/^```([\s\S]*?)```/);
    if (cbMatch) {
      segments.push({ type: "codeblock", content: cbMatch[1] });
      remaining = remaining.slice(cbMatch[0].length);
      continue;
    }

    // Inline code `...`
    const icMatch = remaining.match(/^`([^`]+)`/);
    if (icMatch) {
      segments.push({ type: "code", content: icMatch[1] });
      remaining = remaining.slice(icMatch[0].length);
      continue;
    }

    // Bold *...*
    const boldMatch = remaining.match(/^\*([^*]+)\*/);
    if (boldMatch) {
      segments.push({ type: "bold", children: parseInline(boldMatch[1]) });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic _..._
    const italicMatch = remaining.match(/^_([^_]+)_/);
    if (italicMatch) {
      segments.push({ type: "italic", children: parseInline(italicMatch[1]) });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Underline __...__
    const underlineMatch = remaining.match(/^__([^_]+)__/);
    if (underlineMatch) {
      segments.push({ type: "underline", children: parseInline(underlineMatch[1]) });
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // Strikethrough ~~...~~
    const strikeMatch = remaining.match(/^~~([^~]+)~~/);
    if (strikeMatch) {
      segments.push({ type: "strikethrough", children: parseInline(strikeMatch[1]) });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Spoiler ||...||
    const spoilerMatch = remaining.match(/^\|\|([^|]+)\|\|/);
    if (spoilerMatch) {
      segments.push({ type: "spoiler", children: parseInline(spoilerMatch[1]) });
      remaining = remaining.slice(spoilerMatch[0].length);
      continue;
    }

    // Quote >text (single line)
    const quoteMatch = remaining.match(/^>([^\n]+)/);
    if (quoteMatch) {
      segments.push({ type: "quote", children: parseInline(quoteMatch[1]) });
      remaining = remaining.slice(quoteMatch[0].length);
      continue;
    }

    // Plain text up to next formatting marker or end
    const nextMarker = remaining.search(/[*_~|>`]/);
    if (nextMarker === -1) {
      segments.push({ type: "text", content: remaining });
      break;
    }
    if (nextMarker === 0) {
      // Unmatched marker — treat as literal
      segments.push({ type: "text", content: remaining[0] });
      remaining = remaining.slice(1);
      continue;
    }
    segments.push({ type: "text", content: remaining.slice(0, nextMarker) });
    remaining = remaining.slice(nextMarker);
  }

  return segments;
}

function renderSegments(
  segments: Segment[],
  isOutgoing: boolean,
  keyPrefix: string,
): React.ReactNode[] {
  return segments.map((seg, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (seg.type) {
      case "text":
        return <React.Fragment key={key}>{seg.content}</React.Fragment>;
      case "bold":
        return (
          <strong key={key} className="font-bold">
            {renderSegments(seg.children, isOutgoing, key)}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className="italic">
            {renderSegments(seg.children, isOutgoing, key)}
          </em>
        );
      case "underline":
        return (
          <u key={key} className="underline underline-offset-2">
            {renderSegments(seg.children, isOutgoing, key)}
          </u>
        );
      case "strikethrough":
        return (
          <s key={key} className="line-through opacity-70">
            {renderSegments(seg.children, isOutgoing, key)}
          </s>
        );
      case "spoiler":
        return (
          <span
            key={key}
            className="spoiler cursor-pointer"
            onClick={(e) => {
              e.currentTarget.classList.toggle("revealed");
            }}
          >
            {renderSegments(seg.children, isOutgoing, key)}
          </span>
        );
      case "quote":
        return (
          <blockquote
            key={key}
            className={cn(
              "my-0.5 border-l-2 pl-2 text-sm italic",
              isOutgoing
                ? "border-white/40 text-white/70"
                : "border-primary/40 text-muted-foreground",
            )}
          >
            {renderSegments(seg.children, isOutgoing, key)}
          </blockquote>
        );
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.9em]"
          >
            {seg.content}
          </code>
        );
      case "codeblock":
        return (
          <pre
            key={key}
            className="my-1 overflow-x-auto rounded-lg bg-foreground/5 p-2 font-mono text-[12px] leading-snug"
          >
            <code>{seg.content}</code>
          </pre>
        );
      default:
        return null;
    }
  });
}

/**
 * Renders Telegram-style formatted text:
 *   *bold*  _italic_  __underline__  ~~strikethrough~~  ||spoiler||  >quote  `code`  ```code block```
 */
export function TelegramText({
  text,
  isOutgoing,
}: {
  text: string;
  isOutgoing: boolean;
}) {
  const segments = React.useMemo(() => parseInline(text), [text]);
  const nodes = React.useMemo(
    () => renderSegments(segments, isOutgoing, "tg"),
    [segments, isOutgoing],
  );
  return <>{nodes}</>;
}
