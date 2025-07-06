import React, { useRef, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { socketService } from "../services/socket.service";
import type {
  Participant,
  CursorPosition,
  CodeChange,
  CodeUpdate,
} from "../services/socket.service";
import { Users2 } from "lucide-react";
import {
  useCollaborativeEditorStore,
  useCursors,
  useConnectionStatus,
  useVersion,
  useCurrentUserId,
  useParticipants,
  useIsApplyingRemoteChanges,
  usePendingChanges,
  useLastSentVersion,
} from "../stores";

interface CollaborativeEditorProps {
  sessionId: string;
  initialCode?: string;
  language?: string;
  participants: Participant[];
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  sessionId,
  initialCode = "// Start coding here...\n",
  language = "javascript",
  participants,
}) => {
  const editorRef = useRef<any>(null);

  // Zustand store state
  const {
    setSessionId,
    setConnectionStatus,
    setCurrentUserId,
    setParticipants,
    addCursor,
    removeCursor,
    setApplyingRemoteChanges,
    updateVersion,
    updateLastSentVersion,
    addPendingChange,
    clearPendingChanges,
  } = useCollaborativeEditorStore();

  // Zustand selectors
  const cursors = useCursors();
  const isConnected = useConnectionStatus();
  const version = useVersion();
  const currentUserId = useCurrentUserId();
  const storeParticipants = useParticipants();
  const isApplyingRemoteChanges = useIsApplyingRemoteChanges();
  const pendingChanges = usePendingChanges();
  const lastSentVersion = useLastSentVersion();

  // Initialize session and participants
  useEffect(() => {
    setSessionId(sessionId);
    setParticipants(participants);
  }, [sessionId, participants, setSessionId, setParticipants]);

  // Monitor socket connection state
  useEffect(() => {
    const checkConnection = () => {
      const connected = socketService.isConnected();
      setConnectionStatus(connected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, [setConnectionStatus]);

  // Initialize current user ID once
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.sub);
      } catch (error) {
        console.error("Error parsing JWT token:", error);
      }
    }
  }, [setCurrentUserId]);

  // Send changes immediately - no batching for now
  const sendChanges = useCallback(
    (changes: any[], currentVersion: number) => {
      const newVersion = currentVersion + 1;

      updateVersion(newVersion);
      updateLastSentVersion(newVersion);

      socketService.sendCodeChange(sessionId, changes, newVersion);
    },
    [sessionId, updateVersion, updateLastSentVersion]
  );

  // Create a stable mount handler
  const handleEditorDidMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;
      setConnectionStatus(true);

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

      // Set up content change listener - send immediately
      editor.onDidChangeModelContent((e: any) => {
        const changes = e.changes;
        // Skip if no changes or if we're applying remote changes
        if (changes.length === 0 || isApplyingRemoteChanges) {
          return;
        }

        // Send changes immediately - no batching
        sendChanges(changes, version);
      });
    },
    [
      sessionId,
      initialCode,
      sendChanges,
      version,
      isApplyingRemoteChanges,
      setConnectionStatus,
    ]
  );

  // Transform operations for concurrent editing
  const transformOperation = useCallback(
    (operation: any, otherOperation: any) => {
      // Simple transformation logic - in production, use a library like ShareJS
      if (!operation || !otherOperation) return operation;

      const op = { ...operation };
      const otherOp = { ...otherOperation };

      // If operations don't overlap, no transformation needed
      if (
        op.range.endLineNumber < otherOp.range.startLineNumber ||
        otherOp.range.endLineNumber < op.range.startLineNumber
      ) {
        return op;
      }

      // If other operation is before this one, adjust position
      if (
        otherOp.range.startLineNumber < op.range.startLineNumber ||
        (otherOp.range.startLineNumber === op.range.startLineNumber &&
          otherOp.range.startColumn < op.range.startColumn)
      ) {
        const lineDiff = otherOp.text ? otherOp.text.split("\n").length - 1 : 0;
        const lastLineText = otherOp.text
          ? otherOp.text.split("\n").pop() || ""
          : "";

        if (lineDiff > 0) {
          op.range.startLineNumber += lineDiff;
          op.range.endLineNumber += lineDiff;
        } else if (otherOp.range.startLineNumber === op.range.startLineNumber) {
          op.range.startColumn += lastLineText.length;
          op.range.endColumn += lastLineText.length;
        }
      }

      return op;
    },
    []
  );

  // Handle cursor updates from other users
  useEffect(() => {
    // Only set up listeners if socket is connected
    if (!socketService.isConnected()) {
      return;
    }

    const handleCursorUpdate = (data: {
      userId: string;
      firstName: string;
      lastName: string;
      position: CursorPosition;
    }) => {
      // Don't show our own cursor
      if (data.userId === currentUserId) {
        return;
      }

      addCursor({
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        color: "", // Color will be set by the store
      });
    };

    const handleCodeChange = (data: CodeChange) => {
      // Only apply changes if they're from a different user
      if (data.userId === currentUserId) {
        return;
      }

      if (!editorRef.current) {
        return;
      }

      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }

      // Set flag to prevent feedback loop
      setApplyingRemoteChanges(true);

      try {
        // Transform operations if there are pending local changes
        let transformedChanges = data.changes;

        if (pendingChanges.length > 0) {
          transformedChanges = data.changes.map((change) => {
            let transformedChange = change;
            pendingChanges.forEach((pending) => {
              pending.changes.forEach((pendingChange) => {
                transformedChange = transformOperation(
                  transformedChange,
                  pendingChange
                );
              });
            });
            return transformedChange;
          });
        }

        // Apply transformed changes
        const edits = transformedChanges.map((change: any) => ({
          range: change.range,
          text: change.text,
        }));

        model.applyEdits(edits);

        // Update version
        if (data.version > version) {
          updateVersion(data.version);
        }
      } catch (error) {
        console.error("Error applying remote changes:", error);
      } finally {
        // Reset flag immediately
        setApplyingRemoteChanges(false);
      }
    };

    const handleCodeUpdate = (data: CodeUpdate) => {
      // Only apply updates if they're from a different user
      if (data.userId === currentUserId) {
        return;
      }

      if (!editorRef.current) {
        return;
      }

      // Set flag to prevent feedback loop
      setApplyingRemoteChanges(true);

      try {
        // Replace the entire content with the new code
        editorRef.current.setValue(data.code);
      } catch (error) {
        console.error("Error applying code update:", error);
      } finally {
        // Reset flag immediately
        setApplyingRemoteChanges(false);
      }
    };

    const handleUserJoined = (data: {
      user: any;
      participants: Participant[];
    }) => {
      // Update participants if needed
      setParticipants(data.participants);
    };

    const handleUserLeft = (data: {
      userId: string;
      firstName: string;
      lastName: string;
    }) => {
      removeCursor(data.userId);
    };

    const handleError = (data: { message: string }) => {
      console.error("Socket error:", data.message);
    };

    // Clean up existing listeners first
    socketService.off("cursorUpdated");
    socketService.off("codeChanged");
    socketService.off("codeUpdated");
    socketService.off("userJoined");
    socketService.off("userLeft");
    socketService.off("error");

    // Set up socket listeners
    socketService.onCursorUpdated(handleCursorUpdate);
    socketService.onCodeChanged(handleCodeChange);
    socketService.onCodeUpdated(handleCodeUpdate);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);
    socketService.onError(handleError);

    return () => {
      socketService.off("cursorUpdated");
      socketService.off("codeChanged");
      socketService.off("codeUpdated");
      socketService.off("userJoined");
      socketService.off("userLeft");
      socketService.off("error");
    };
  }, [
    sessionId,
    version,
    currentUserId,
    pendingChanges,
    transformOperation,
    isConnected,
    addCursor,
    removeCursor,
    setApplyingRemoteChanges,
    updateVersion,
    setParticipants,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        socketService.leaveSession(sessionId);
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
              Participants ({storeParticipants.length})
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
            <div className="text-xs text-gray-400">v{version}</div>
          </div>
        </div>

        {/* Participants list */}
        <div className="flex flex-wrap gap-2 mt-2">
          {storeParticipants.map((participant, index) => (
            <div
              key={participant.id}
              className="flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-full text-sm"
              style={{
                borderLeft: `3px solid ${
                  [
                    "#FF6B6B",
                    "#4ECDC4",
                    "#45B7D1",
                    "#96CEB4",
                    "#FFEAA7",
                    "#DDA0DD",
                    "#98D8C8",
                    "#F7DC6F",
                  ][index % 8]
                }`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: [
                    "#FF6B6B",
                    "#4ECDC4",
                    "#45B7D1",
                    "#96CEB4",
                    "#FFEAA7",
                    "#DDA0DD",
                    "#98D8C8",
                    "#F7DC6F",
                  ][index % 8],
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
            // Disable some features that can interfere with real-time collaboration
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: "off",
            tabCompletion: "off",
            wordBasedSuggestions: false,
            // Optimize for fast typing
            fastScrollSensitivity: 5,
            scrollBeyondLastColumn: 10,
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
                zIndex: 1000,
              }}
            >
              <div
                className="w-0.5 h-5"
                style={{ backgroundColor: cursor.color }}
              ></div>
              <div
                className="px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
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
