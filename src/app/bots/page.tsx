"use client";

import * as React from "react";
import { Bot, Puzzle } from "lucide-react";
import Link from "next/link";

export default function BotsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Боты</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/bots/constructor"
          className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center transition-shadow hover:shadow-md"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Puzzle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Конструктор</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Создавайте ботов с помощью визуального редактора
            </p>
          </div>
        </Link>

        <Link
          href="/bots/market"
          className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center transition-shadow hover:shadow-md"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Магазин</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Устанавливайте готовых ботов от сообщества
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
