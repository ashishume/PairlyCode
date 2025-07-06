import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { devtools } from "zustand/middleware";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuthState {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuthenticated: (authenticated: boolean) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth actions
  login: (user: User, token: string) => void;
  logout: () => void;

  // Utility actions
  reset: () => void;
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      setUser: (user: User | null) => set({ user }),

      setToken: (token: string | null) => set({ token }),

      setAuthenticated: (authenticated: boolean) =>
        set({ isAuthenticated: authenticated }),

      setLoading: (loading: boolean) => set({ loading }),

      setError: (error: string | null) => set({ error }),

      login: (user: User, token: string) => {
        // Store in localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userId", user.id);

        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
        });
      },

      logout: () => {
        // Clear localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      reset: () => set(initialState),
    })),
    { name: "auth-store" }
  )
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useToken = () => useAuthStore((state) => state.token);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
