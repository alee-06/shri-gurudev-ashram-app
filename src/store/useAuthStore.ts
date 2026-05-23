import { create } from 'zustand';

type User = { id?: string; name?: string } | null;

type AuthState = {
  user: User;
  setUser: (u: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set: any) => ({
  user: null,
  setUser: (u: User) => set({ user: u }),
  logout: () => set({ user: null }),
}));
