import React, { useRef, useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { socketService } from "../services/socket.service";
import type {
  Participant,
  CursorPosition,
  CodeChange,
} from "../services/socket.service";
import { Users2 } from "lucide-react";

interface CollaborativeEditorProps {
  sessionId: string;
  initialCode?: string;
  language?: string;
  participants: Participant[];
  onCodeChange?: (code: string) => void;
}

interface CursorInfo {
  userId: string;
  firstName: string;
  lastName: string;
  position: CursorPosition;
  color: string;
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

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  sessionId,
  initialCode = "// Start coding here...\n",
  language = "javascript",
  participants,
  onCodeChange,
}) => {
  const editorRef = useRef<any>(null);
  const [cursors, setCursors] = useState<CursorInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [version, setVersion] = useState(0);

  // Use a more reliable flag system
  const isApplyingRemoteChangesRef = useRef(false);
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Initialize current user ID once
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        currentUserIdRef.current = payload.sub;
        console.log("Current user ID:", currentUserIdRef.current);
      } catch (error) {
        console.error("Error parsing JWT token:", error);
      }
    }
  }, []);

  // Generate unique colors for participants
  const getParticipantColor = useCallback(
    (userId: string) => {
      const index = participants.findIndex((p) => p.id === userId);
      return CURSOR_COLORS[index % CURSOR_COLORS.length];
    },
    [participants]
  );

  // Create a stable mount handler
  const handleEditorDidMount = useCallback(
    (editor: any) => {
      console.log(
        "Editor mounted, setting up listeners for session:",
        sessionId
      );
      editorRef.current = editor;
      setIsConnected(true);

      // Set initial code if different from default
      if (initialCode !== "// Start coding here...\n") {
        editor.setValue(initialCode);
      }

      // Set up cursor change listener
      editor.onDidChangeCursorPosition((e: any) => {
        const position = {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        };
        socketService.updateCursor(sessionId, position);
      });

      // Set up content change listener with improved logic
      editor.onDidChangeModelContent((e: any) => {
        const changes = e.changes;

        // Skip if no changes or if we're applying remote changes
        if (changes.length === 0 || isApplyingRemoteChangesRef.current) {
          console.log(
            "Skipping change - no changes or applying remote changes"
          );
          return;
        }

        console.log("Local content change detected:", {
          changes: changes.length,
          sessionId,
          version,
        });

        // Clear any existing timeout
        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current);
        }

        // Debounce the change to prevent rapid-fire events
        changeTimeoutRef.current = setTimeout(() => {
          const newVersion = version + 1;
          setVersion(newVersion);

          console.log("Sending local changes (debounced):", {
            changes,
            newVersion,
            sessionId,
          });

          socketService.sendCodeChange(sessionId, changes, newVersion);

          // Call onCodeChange if provided
          if (onCodeChange) {
            onCodeChange(editor.getValue());
          }
        }, 100); // Increased debounce time to 100ms
      });
    },
    [sessionId, initialCode, version, onCodeChange]
  );

  // Handle cursor updates from other users
  useEffect(() => {
    const handleCursorUpdate = (data: {
      userId: string;
      firstName: string;
      lastName: string;
      position: CursorPosition;
    }) => {
      // Don't show our own cursor
      if (data.userId === currentUserIdRef.current) {
        return;
      }

      setCursors((prev) => {
        const existing = prev.find((c) => c.userId === data.userId);
        if (existing) {
          return prev.map((c) =>
            c.userId === data.userId ? { ...c, position: data.position } : c
          );
        } else {
          // Get color for new participant
          const index = participants.findIndex((p) => p.id === data.userId);
          const color = CURSOR_COLORS[index % CURSOR_COLORS.length];

          return [
            ...prev,
            {
              userId: data.userId,
              firstName: data.firstName,
              lastName: data.lastName,
              position: data.position,
              color: color,
            },
          ];
        }
      });
    };

    const handleCodeChange = (data: CodeChange) => {
      console.log(
        "Received code change from:",
        data.userId,
        "Current user:",
        currentUserIdRef.current
      );

      // Only apply changes if they're from a different user
      if (data.userId === currentUserIdRef.current) {
        console.log("Ignoring own changes");
        return;
      }

      if (!editorRef.current) {
        console.log("Editor not ready");
        return;
      }

      const model = editorRef.current.getModel();
      if (!model) {
        console.log("Model not available");
        return;
      }

      console.log("Applying changes:", data.changes, "version:", data.version);

      // Set flag to prevent feedback loop - use synchronous flag
      isApplyingRemoteChangesRef.current = true;

      try {
        // Apply remote changes directly
        model.applyEdits(data.changes);
        console.log("Remote changes applied successfully");

        // Update version if the incoming version is higher
        if (data.version > version) {
          setVersion(data.version);
          console.log("Version updated to:", data.version);
        }
      } catch (error) {
        console.error("Error applying remote changes:", error);
      } finally {
        // Reset flag immediately after applying changes
        setTimeout(() => {
          isApplyingRemoteChangesRef.current = false;
          console.log("Remote changes flag reset");
        }, 50); // Small delay to ensure Monaco events are processed
      }
    };

    const handleUserJoined = (data: {
      user: any;
      participants: Participant[];
    }) => {
      console.log("User joined:", data.user);
    };

    const handleUserLeft = (data: {
      userId: string;
      firstName: string;
      lastName: string;
    }) => {
      setCursors((prev) => prev.filter((c) => c.userId !== data.userId));
    };

    const handleError = (data: { message: string }) => {
      console.error("Socket error:", data.message);
    };

    // Clean up existing listeners first
    socketService.off("cursorUpdated");
    socketService.off("codeChanged");
    socketService.off("userJoined");
    socketService.off("userLeft");
    socketService.off("error");

    // Set up socket listeners
    socketService.onCursorUpdated(handleCursorUpdate);
    socketService.onCodeChanged(handleCodeChange);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);
    socketService.onError(handleError);

    return () => {
      socketService.off("cursorUpdated");
      socketService.off("codeChanged");
      socketService.off("userJoined");
      socketService.off("userLeft");
      socketService.off("error");
    };
  }, [sessionId, version, participants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        socketService.leaveSession(sessionId);
      }
      // Clear any pending timeouts
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [sessionId, isConnected]);

  return (
    <div className="flex flex-col h-full">
      {/* Participants bar */}
      <div className="bg-gray-800 text-white p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users2 className="w-5 h-5" />
            <span className="font-medium">
              Participants ({participants.length})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-sm">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Participants list */}
        <div className="flex flex-wrap gap-2 mt-2">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-full text-sm"
              style={{
                borderLeft: `3px solid ${
                  CURSOR_COLORS[index % CURSOR_COLORS.length]
                }`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: CURSOR_COLORS[index % CURSOR_COLORS.length],
                }}
              ></div>
              <span>
                {participant.firstName} {participant.lastName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language}
          defaultValue={initialCode}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: "selection",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
          }}
        />

        {/* Remote cursors overlay */}
        <div
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {cursors.map((cursor) => (
            <div
              key={cursor.userId}
              className="absolute transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${cursor.position.column * 8}px`,
                top: `${(cursor.position.lineNumber - 1) * 20}px`,
              }}
            >
              <div
                className="w-0.5 h-5"
                style={{ backgroundColor: cursor.color }}
              ></div>
              <div
                className="px-2 py-1 text-xs text-white rounded shadow-lg"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.firstName} {cursor.lastName}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
