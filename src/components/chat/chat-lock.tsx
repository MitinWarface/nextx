"use client";

import * as React from "react";
import { Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";

interface ChatLockProps {
  chatId: string;
  isLocked: boolean;
  onVerified?: () => void;
}

export function ChatLock({ chatId, isLocked, onVerified }: ChatLockProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"enter" | "set" | "remove" | "confirm-set" | "confirm-remove">(
    isLocked ? "enter" : "set",
  );
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setPin("");
      setConfirmPin("");
      setMode(isLocked ? "enter" : "set");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, isLocked]);

  const handleVerify = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("PIN должен содержать 4 цифры");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/pin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action: mode === "enter" ? "verify" : mode === "set" || mode === "confirm-set" ? "set" : "remove" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(mode === "enter" ? "Чат разблокирован" : mode === "set" || mode === "confirm-set" ? "PIN установлен" : "PIN снят");
        setOpen(false);
        onVerified?.();
      } else {
        if (data.error === "wrong_pin") toast.error("Неверный PIN");
        else if (data.error === "pin_mismatch") toast.error("PIN-коды не совпадают");
        else toast.error("Ошибка");
      }
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  if (!isLocked) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="PIN-замок"
        title="Открыть чат"
      >
        <Lock className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {mode === "enter" ? "Введите PIN" : mode === "set" ? "Установить PIN" : "Снять PIN"}
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            {mode === "set" ? (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  Установите 4-значный PIN-код для блокировки этого чата.
                </p>
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && setMode("confirm-set")}
                  placeholder="PIN"
                  className="mb-3 w-full rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => pin.length === 4 && setMode("confirm-set")}
                  disabled={pin.length !== 4}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40"
                >
                  Далее
                </button>
              </>
            ) : mode === "confirm-set" ? (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  Повторите PIN-код для подтверждения.
                </p>
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && confirmPin.length === 4 && handleVerify()}
                  placeholder="Подтвердите PIN"
                  className="mb-3 w-full rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setMode("set"); setConfirmPin(""); }}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPin(confirmPin); handleVerify(); }}
                    disabled={confirmPin.length !== 4 || loading}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40"
                  >
                    {loading ? "..." : "Сохранить"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {mode === "enter" ? "Введите 4-значный PIN для доступа к чату." : "Введите текущий PIN для снятия блокировки."}
                </p>
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handleVerify()}
                  placeholder="PIN"
                  className="mb-3 w-full rounded-lg border border-border bg-muted/60 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Отмена
                  </button>
                  {isLocked && (
                    <button
                      type="button"
                      onClick={() => { setMode("remove"); setPin(""); }}
                      className="flex-1 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      Снять PIN
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={pin.length !== 4 || loading}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40"
                  >
                    {loading ? "..." : "Открыть"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return <Lock className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", className)} aria-label="locked" />;
}
