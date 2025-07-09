import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import type { Session, SessionParticipant } from "./collaborativeEditorStore";

interface SessionState {
  currentSession: Session | null;
  sessions: Session[];
  participants: SessionParticipant[];

  loading: boolean;
  error: string | null;

  // Actions
  setParticipants: (participants: SessionParticipant[]) => void;
  setCurrentSession: (session: Session | null) => void;
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  removeSession: (sessionId: string) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Utility actions
  reset: () => void;
}

const initialState = {
  currentSession: null,
  sessions: [],
  loading: false,
  error: null,
};

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector(
    devtools(
      (set) => ({
        ...initialState,

        setCurrentSession: (session: Session | null) =>
          set({ currentSession: session }),

        setSessions: (sessions: Session[]) => set({ sessions }),

        addSession: (session: Session) =>
          set((state) => ({
            sessions: [...state.sessions, session],
          })),

        updateSession: (sessionId: string, updates: Partial<Session>) =>
          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId ? { ...session, ...updates } : session
            ),
            currentSession:
              state.currentSession?.id === sessionId
                ? { ...state.currentSession, ...updates }
                : state.currentSession,
          })),

        removeSession: (sessionId: string) =>
          set((state) => ({
            sessions: state.sessions.filter(
              (session) => (session.id || session._id) !== sessionId
            ),
            currentSession:
              (state.currentSession?.id || state.currentSession?._id) ===
              sessionId
                ? null
                : state.currentSession,
          })),

        setLoading: (loading: boolean) => set({ loading }),

        setError: (error: string | null) => set({ error }),

        reset: () => set(initialState),

        setParticipants: (participants: SessionParticipant[]) =>
          set({ participants }),
      }),
      { name: "session-store" }
    )
  )
);

// Selectors for better performance
export const useCurrentSession = () =>
  useSessionStore((state) => state.currentSession);
export const useSessions = () => useSessionStore((state) => state.sessions);
export const useSessionLoading = () =>
  useSessionStore((state) => state.loading);
export const useSessionError = () => useSessionStore((state) => state.error);
