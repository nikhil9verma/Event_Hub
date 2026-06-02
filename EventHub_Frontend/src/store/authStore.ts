import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, Role } from '../types';

interface AuthState {
  token: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    course?: string
  batch?: string
    role: Role;
    profileImageUrl?: string;
  } | null;
  isAuthenticated: boolean;
  setAuth: (data: AuthResponse) => void;
  updateUser: (data: Partial<AuthState['user']>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (data: AuthResponse) =>
        set({
          token: data.token,
          isAuthenticated: true,
          user: {
            id: data.userId,
            name: data.name,
            email: data.email,
            course: data.course,
            batch: data.batch,
            role: data.role,
            profileImageUrl: data.profileImageUrl,
          },
        }),

      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : state.user,
        })),

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'eventhub-auth' }
  )
);