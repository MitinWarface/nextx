"use client";

import { create } from "zustand";

interface CallRemote {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface CallStore {
  /** Кому звоним (set при нажатии на кнопку звонка в topbar) */
  outgoingRemote: CallRemote | null;
  outgoingKind: "AUDIO" | "VIDEO";
  setOutgoingRemote: (r: CallRemote | null, kind?: "AUDIO" | "VIDEO") => void;
}

export const useCallStore = create<CallStore>((set) => ({
  outgoingRemote: null,
  outgoingKind: "AUDIO",
  setOutgoingRemote: (r, kind) =>
    set({ outgoingRemote: r, outgoingKind: kind ?? "AUDIO" }),
}));
