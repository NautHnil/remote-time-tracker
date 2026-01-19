import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/authService";

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  system_role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isSystemAdmin: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          error: null,
        });
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      isAdmin: () => {
        const state = get();
        return state.user?.role === "admin";
      },

      isSystemAdmin: () => {
        const state = get();
        return state.user?.system_role === "admin";
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(email, password);
          if (response.success && response.data) {
            const { user, access_token, refresh_token } = response.data;
            get().setAuth(user, access_token, refresh_token);
          } else {
            throw new Error(response.message || "Login failed");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Login failed";
          set({ error: errorMessage, isLoading: false });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
