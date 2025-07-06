import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import type {
  Participant,
  CursorPosition,
  CodeChange,
  CodeUpdate,
} from "../services/socket.service";

interface CursorInfo {
  userId: string;
  firstName: string;
  lastName: string;
  position: CursorPosition;
  color: string;
}

interface PendingChange {
  changes: any[];
  version: number;
  timestamp: number;
}

interface CollaborativeEditorState {
  // Session state
  sessionId: string | null;
  isConnected: boolean;
  version: number;

  // User state
  currentUserId: string | null;
  participants: Participant[];

  // Cursor state
  cursors: CursorInfo[];

  // Editor state
  isApplyingRemoteChanges: boolean;
  pendingChanges: PendingChange[];
  lastSentVersion: number;

  // Actions
  setSessionId: (id: string) => void;
  setConnectionStatus: (connected: boolean) => void;
  updateVersion: (version: number) => void;
  setCurrentUserId: (userId: string) => void;
  setParticipants: (participants: Participant[]) => void;

  // Cursor actions
  updateCursors: (cursors: CursorInfo[]) => void;
  addCursor: (cursor: CursorInfo) => void;
  updateCursor: (userId: string, position: CursorPosition) => void;
  removeCursor: (userId: string) => void;
  clearCursors: () => void;

  // Editor actions
  setApplyingRemoteChanges: (applying: boolean) => void;
  addPendingChange: (change: PendingChange) => void;
  clearPendingChanges: () => void;
  updateLastSentVersion: (version: number) => void;

  // Utility actions
  reset: () => void;
}

const CURSOR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
];

const initialState = {
  sessionId: null,
  isConnected: false,
  version: 0,
  currentUserId: null,
  participants: [],
  cursors: [],
  isApplyingRemoteChanges: false,
  pendingChanges: [],
  lastSentVersion: 0,
};

export const useCollaborativeEditorStore = create<CollaborativeEditorState>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
        ...initialState,

        setSessionId: (id: string) => set({ sessionId: id }),

        setConnectionStatus: (connected: boolean) =>
          set({ isConnected: connected }),

        updateVersion: (version: number) => set({ version }),

        setCurrentUserId: (userId: string) => set({ currentUserId: userId }),

        setParticipants: (participants: Participant[]) => set({ participants }),

        updateCursors: (cursors: CursorInfo[]) => set({ cursors }),

        addCursor: (cursor: CursorInfo) =>
          set((state) => {
            const existing = state.cursors.find(
              (c) => c.userId === cursor.userId
            );
            if (existing) {
              return {
                cursors: state.cursors.map((c) =>
                  c.userId === cursor.userId
                    ? { ...c, position: cursor.position }
                    : c
                ),
              };
            } else {
              const index = state.participants.findIndex(
                (p) => p.id === cursor.userId
              );
              const color = CURSOR_COLORS[index % CURSOR_COLORS.length];

              return {
                cursors: [
                  ...state.cursors,
                  {
                    ...cursor,
                    color,
                  },
                ],
              };
            }
          }),

        updateCursor: (userId: string, position: CursorPosition) =>
          set((state) => ({
            cursors: state.cursors.map((c) =>
              c.userId === userId ? { ...c, position } : c
            ),
          })),

        removeCursor: (userId: string) =>
          set((state) => ({
            cursors: state.cursors.filter((c) => c.userId !== userId),
          })),

        clearCursors: () => set({ cursors: [] }),

        setApplyingRemoteChanges: (applying: boolean) =>
          set({ isApplyingRemoteChanges: applying }),

        addPendingChange: (change: PendingChange) =>
          set((state) => ({
            pendingChanges: [...state.pendingChanges, change],
          })),

        clearPendingChanges: () => set({ pendingChanges: [] }),

        updateLastSentVersion: (version: number) =>
          set({ lastSentVersion: version }),

        reset: () => set(initialState),
      }),
      { name: "collaborative-editor-store" }
    )
  )
);

// Selectors for better performance
export const useCursors = () =>
  useCollaborativeEditorStore((state) => state.cursors);
export const useConnectionStatus = () =>
  useCollaborativeEditorStore((state) => state.isConnected);
export const useVersion = () =>
  useCollaborativeEditorStore((state) => state.version);
export const useCurrentUserId = () =>
  useCollaborativeEditorStore((state) => state.currentUserId);
export const useParticipants = () =>
  useCollaborativeEditorStore((state) => state.participants);
export const useIsApplyingRemoteChanges = () =>
  useCollaborativeEditorStore((state) => state.isApplyingRemoteChanges);
export const usePendingChanges = () =>
  useCollaborativeEditorStore((state) => state.pendingChanges);
export const useLastSentVersion = () =>
  useCollaborativeEditorStore((state) => state.lastSentVersion);
