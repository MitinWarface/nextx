"use client";

import * as React from "react";
import { useCall, UseCallResult, CallParticipant, CallKind } from "@/hooks/use-call";

const CallContext = React.createContext<UseCallResult | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const call = useCall();
  return <CallContext.Provider value={call}>{children}</CallContext.Provider>;
}

export function useCallContext(): UseCallResult {
  const ctx = React.useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

export type { CallParticipant, CallKind };
