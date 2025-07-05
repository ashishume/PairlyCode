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
  const [code, setCode] = useState(initialCode);
  const [cursors, setCursors] = useState<CursorInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [version, setVersion] = useState(0);

  // Generate unique colors for participants
  const getParticipantColor = useCallback(
    (userId: string) => {
      const index = participants.findIndex((p) => p.id === userId);
      return CURSOR_COLORS[index % CURSOR_COLORS.length];
    },
    [participants]
  );

  // Handle editor mount
  const handleEditorDidMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;
      setIsConnected(true);

      // Set up cursor change listener
      editor.onDidChangeCursorPosition((e: any) => {
        const position = {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        };

        socketService.updateCursor(sessionId, position);
      });

      // Set up content change listener
      editor.onDidChangeModelContent((e: any) => {
        const changes = e.changes;
        const newVersion = version + 1;
        setVersion(newVersion);

        socketService.sendCodeChange(sessionId, changes, newVersion);

        if (onCodeChange) {
          onCodeChange(editor.getValue());
        }
      });
    },
    [sessionId, version, onCodeChange]
  );

  // Handle cursor updates from other users
  useEffect(() => {
    const handleCursorUpdate = (data: {
      userId: string;
      firstName: string;
      lastName: string;
      position: CursorPosition;
    }) => {
      setCursors((prev) => {
        const existing = prev.find((c) => c.userId === data.userId);
        if (existing) {
          return prev.map((c) =>
            c.userId === data.userId ? { ...c, position: data.position } : c
          );
        } else {
          return [
            ...prev,
            {
              userId: data.userId,
              firstName: data.firstName,
              lastName: data.lastName,
              position: data.position,
              color: getParticipantColor(data.userId),
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
        localStorage.getItem("userId")
      );
      if (editorRef.current && data.userId !== localStorage.getItem("userId")) {
        // Apply changes from other users
        const model = editorRef.current.getModel();
        if (model) {
          console.log("Applying changes:", data.changes);
          model.applyEdits(data.changes);
          setCode(model.getValue());
        }
      }
    };

    const handleUserJoined = (data: {
      user: any;
      participants: Participant[];
    }) => {
      // Update participants list if needed
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
  }, [sessionId, getParticipantColor]);

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
          value={code}
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
                left: `${cursor.position.column * 8}px`, // Approximate character width
                top: `${(cursor.position.lineNumber - 1) * 20}px`, // Approximate line height
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
