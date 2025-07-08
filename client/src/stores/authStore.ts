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
  isInitialized: boolean;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setInitialized: (initialized: boolean) => void; // Add this action

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
  isInitialized: false,
  loading: false,
  error: null,
};

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    devtools(
      (set) => ({
        ...initialState,

        setUser: (user: User | null) => set({ user }),

        setToken: (token: string | null) => set({ token }),

        setAuthenticated: (authenticated: boolean) =>
          set({ isAuthenticated: authenticated }),

        setInitialized: (initialized: boolean) =>
          set({ isInitialized: initialized }),

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
            isInitialized: true, // Keep initialized true after logout
          });
        },

        reset: () => set({ ...initialState, isInitialized: true }),
      }),
      { name: "auth-store" }
    )
  )
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useToken = () => useAuthStore((state) => state.token);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useIsInitialized = () =>
  useAuthStore((state) => state.isInitialized);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);
