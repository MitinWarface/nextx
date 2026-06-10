import { create } from "zustand";

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role?: string;
  features?: string[];
}

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  setUser: (user: CurrentUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
