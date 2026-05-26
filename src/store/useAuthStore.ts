import { create } from 'zustand';

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  role: 'member' | 'collector';
};

type AuthState = {
  user: AuthUser | null;
  setUser: (u: AuthUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  logout: () => set({ user: null }),
}));
