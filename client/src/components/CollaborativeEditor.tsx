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
  const lastAppliedChangeRef = useRef<string>("");
  const isApplyingRemoteChangesRef = useRef(false);
  const lastLocalChangeRef = useRef<string>("");
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const changeHistoryRef = useRef<Set<string>>(new Set());
  const pendingLocalChangesRef = useRef<any[]>([]);

  // Helper function to create a hash of changes
  const createChangeHash = useCallback((changes: any[], userId: string) => {
    const changeString = JSON.stringify(
      changes.map((change) => ({
        range: change.range,
        text: change.text,
        userId,
      }))
    );
    const hash = btoa(changeString).slice(0, 16);
    return hash;
  }, []);

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

    // Join the session via WebSocket
    if (sessionId && isConnected) {
      // console.log("Joining session:", sessionId);
      socketService.joinSession(sessionId);
    }
  }, [sessionId, participants, setSessionId, setParticipants, isConnected]);

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

  // Send changes with batching instead of debouncing
  const sendChanges = useCallback(
    (changes: any[], currentVersion: number) => {
      try {
        // Don't send if we're currently applying remote changes
        if (isApplyingRemoteChangesRef.current) {
          return;
        }

        // Add changes to pending batch
        pendingLocalChangesRef.current.push(...changes);

        // Clear any existing timeout
        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current);
        }

        // Batch the changes and send after a short delay
        changeTimeoutRef.current = setTimeout(() => {
          const batchedChanges = [...pendingLocalChangesRef.current];
          pendingLocalChangesRef.current = []; // Clear the batch

          // Use current version from store, not the captured version
          const currentStoreVersion = version;

          if (batchedChanges.length === 0) {
            return;
          }

          // Create a hash for the batched changes
          const changeHash = createChangeHash(
            batchedChanges,
            currentUserId || ""
          );

          // Skip if this is our own change that we've already sent
          // TEMPORARILY DISABLED FOR DEBUGGING
          // if (lastLocalChangeRef.current === changeHash) {
          //   console.log("❌ Skipping send - already sent this change");
          //   return;
          // }

          const newVersion = currentStoreVersion + 1;
          updateVersion(newVersion);
          updateLastSentVersion(newVersion);

          // Track this as our last sent change
          // TEMPORARILY DISABLED FOR DEBUGGING
          // lastLocalChangeRef.current = changeHash;

          // Clean up old history entries (keep last 50)
          if (changeHistoryRef.current.size > 50) {
            const entries = Array.from(changeHistoryRef.current);
            changeHistoryRef.current = new Set(entries.slice(-50));
          }

          socketService.sendCodeChange(sessionId, batchedChanges, newVersion);
        }, 50); // 50ms batching delay
      } catch (error) {
        console.error("🔥 Error in sendChanges:", error);
      }
    },
    [
      sessionId,
      updateVersion,
      updateLastSentVersion,
      currentUserId,
      createChangeHash,
    ]
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

      // Set up content change listener with batching
      editor.onDidChangeModelContent((e: any) => {
        const changes = e.changes;

        // Skip if no changes or if we're applying remote changes
        if (changes.length === 0 || isApplyingRemoteChangesRef.current) {
          return;
        }

        // console.log("Sending code changes:", { changes, version, sessionId });
        // Send changes with batching
        sendChanges(changes, version);
      });
    },
    [
      sessionId,
      initialCode,
      sendChanges,
      version,
      currentUserId,
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

  // Create stable event handlers using useCallback
  const handleCursorUpdate = useCallback(
    (data: {
      userId: string;
      firstName: string;
      lastName: string;
      position: CursorPosition;
    }) => {
      // Don't show our own cursor
      // Convert both to strings for comparison to handle ObjectId vs string differences
      const dataUserIdStr = String(data.userId);
      const currentUserIdStr = String(currentUserId);

      if (dataUserIdStr === currentUserIdStr) {
        return;
      }

      addCursor({
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        position: data.position,
        color: "", // Color will be set by the store
      });
    },
    [currentUserId, addCursor]
  );

  const handleCodeChange = useCallback(
    (data: CodeChange) => {
      // Only apply changes if they're from a different user
      // Convert both to strings for comparison to handle ObjectId vs string differences
      const dataUserIdStr = String(data.userId);
      const currentUserIdStr = String(currentUserId);

      if (dataUserIdStr === currentUserIdStr) {
        return;
      }

      if (!editorRef.current) {
        return;
      }

      const model = editorRef.current.getModel();
      if (!model) {
        return;
      }

      // Create a hash for this incoming change
      const incomingChangeHash = createChangeHash(data.changes, data.userId);

      // Skip if this change has already been processed
      // TEMPORARILY DISABLED FOR DEBUGGING
      // if (changeHistoryRef.current.has(incomingChangeHash)) {
      //   console.log("Change already processed, skipping");
      //   return;
      // }

      // Set flag to prevent feedback loop
      isApplyingRemoteChangesRef.current = true;
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

        // Add to history AFTER successful application to prevent re-processing
        // TEMPORARILY DISABLED FOR DEBUGGING
        // changeHistoryRef.current.add(incomingChangeHash);
      } catch (error) {
        console.error("Error applying remote changes:", error);
        // Don't add to history if there was an error
      } finally {
        // Reset flag after a small delay to ensure the editor has finished processing
        setTimeout(() => {
          isApplyingRemoteChangesRef.current = false;
          setApplyingRemoteChanges(false);
        }, 50);
      }
    },
    [
      currentUserId,
      createChangeHash,
      setApplyingRemoteChanges,
      pendingChanges,
      transformOperation,
      version,
      updateVersion,
    ]
  );

  const handleCodeUpdate = useCallback(
    (data: CodeUpdate) => {
      // Only apply updates if they're from a different user
      // Convert both to strings for comparison to handle ObjectId vs string differences
      const dataUserIdStr = String(data.userId);
      const currentUserIdStr = String(currentUserId);

      if (dataUserIdStr === currentUserIdStr) {
        return;
      }

      if (!editorRef.current) {
        return;
      }

      // Create a hash for this code update
      const updateHash = btoa(
        JSON.stringify({
          code: data.code,
          userId: data.userId,
        })
      ).slice(0, 16);

      // Skip if this update has already been processed
      if (changeHistoryRef.current.has(updateHash)) {
        return;
      }

      // Set flag to prevent feedback loop
      isApplyingRemoteChangesRef.current = true;
      setApplyingRemoteChanges(true);

      try {
        // Replace the entire content with the new code
        editorRef.current.setValue(data.code);

        // Add to history AFTER successful application to prevent re-processing
        changeHistoryRef.current.add(updateHash);
      } catch (error) {
        console.error("Error applying code update:", error);
        // Don't add to history if there was an error
      } finally {
        // Reset flag after a small delay to ensure the editor has finished processing
        setTimeout(() => {
          isApplyingRemoteChangesRef.current = false;
          setApplyingRemoteChanges(false);
        }, 50);
      }
    },
    [currentUserId, setApplyingRemoteChanges]
  );

  const handleUserJoined = useCallback(
    (data: { user: any; participants: Participant[] }) => {
      // Update participants if needed
      setParticipants(data.participants);
    },
    [setParticipants]
  );

  const handleSessionJoined = useCallback(
    (data: { session: any; participants: Participant[] }) => {
      // Update participants when we join the session
      setParticipants(data.participants);
    },
    [setParticipants]
  );

  const handleUserLeft = useCallback(
    (data: { userId: string; firstName: string; lastName: string }) => {
      removeCursor(data.userId);
    },
    [removeCursor]
  );

  const handleError = useCallback((data: { message: string }) => {
    console.error("Socket error:", data.message);
  }, []);

  // Handle socket event listeners - only set up when sessionId changes or connection status changes
  useEffect(() => {
    // Only set up listeners if socket is connected
    if (!isConnected) {
      return;
    }

    // Clean up existing listeners first
    socketService.off("cursorUpdated");
    socketService.off("codeChanged");
    socketService.off("codeUpdated");
    socketService.off("userJoined");
    socketService.off("sessionJoined");
    socketService.off("userLeft");
    socketService.off("error");

    // Set up socket listeners
    socketService.onCursorUpdated(handleCursorUpdate);
    socketService.onCodeChanged(handleCodeChange);
    socketService.onCodeUpdated(handleCodeUpdate);
    socketService.onUserJoined(handleUserJoined);
    socketService.onSessionJoined(handleSessionJoined);
    socketService.onUserLeft(handleUserLeft);
    socketService.onError(handleError);

    return () => {
      socketService.off("cursorUpdated");
      socketService.off("codeChanged");
      socketService.off("codeUpdated");
      socketService.off("userJoined");
      socketService.off("sessionJoined");
      socketService.off("userLeft");
      socketService.off("error");
    };
  }, [
    sessionId,
    isConnected,
    handleCursorUpdate,
    handleCodeChange,
    handleCodeUpdate,
    handleUserJoined,
    handleSessionJoined,
    handleUserLeft,
    handleError,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }

      // Clear pending changes
      pendingLocalChangesRef.current = [];

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
            <button
              onClick={() => {
                const testChange = {
                  range: {
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: 1,
                  },
                  text: "// Test change\n",
                };
                socketService.sendCodeChange(
                  sessionId,
                  [testChange],
                  version + 1
                );
              }}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Test Send
            </button>
            <button
              onClick={() => {
                const testData = {
                  userId: "test-user-123",
                  firstName: "Test",
                  lastName: "User",
                  changes: [
                    {
                      range: {
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: 1,
                        endColumn: 1,
                      },
                      text: "// Manual test\n",
                    },
                  ],
                  version: version + 1,
                };
                handleCodeChange(testData);
              }}
              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
            >
              Test Receive
            </button>
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
