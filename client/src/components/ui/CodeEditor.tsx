import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { User } from "lucide-react";

interface User {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

interface CodeEditorProps {
  sessionId: string;
  initialCode: string;
  language: string;
  currentUser: {
    id: string;
    name: string;
    color?: string;
  };
  onOnlineUsersChange?: (users: Map<string, User>) => void;
}

function CodeEditor({
  sessionId,
  initialCode,
  language,
  currentUser,
  onOnlineUsersChange,
}: CodeEditorProps) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [editor, setEditor] = useState<any | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [, setBinding] = useState<MonacoBinding | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, User>>(new Map());
  const decorationsRef = useRef<string[]>([]);
  const [output, setOutput] = useState<string>("");

  // Generate a random color for the user if not provided
  const userColor = useMemo(() => {
    if (currentUser.color) return currentUser.color;
    const colors = [
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Blue
      "#96CEB4", // Green
      "#FFEAA7", // Yellow
      "#DDA0DD", // Pink
      "#98D8C8", // Mint
      "#F7DC6F", // Gold
      "#FF8A80", // Light Red
      "#80CBC4", // Light Teal
      "#81C784", // Light Green
      "#FFB74D", // Orange
      "#BA68C8", // Purple
      "#4FC3F7", // Light Blue
      "#FFD54F", // Amber
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, [currentUser.color]);

  // this effect manages the lifetime of the Yjs document and the provider
  useEffect(() => {
    const wsProvider = new WebsocketProvider(
      "ws://localhost:1234",
      sessionId,
      ydoc
    );

    // Set up awareness with current user info
    wsProvider.awareness.setLocalStateField("user", {
      id: currentUser.id,
      name: currentUser.name,
      color: userColor,
    });

    setProvider(wsProvider);

    return () => {
      wsProvider?.destroy();
      ydoc.destroy();
    };
  }, [ydoc, currentUser.id, currentUser.name, userColor, sessionId]);

  // Handle awareness updates
  useEffect(() => {
    if (!provider?.awareness) return;

    const awarenessChangeHandler = ({ added, updated, removed }: any) => {
      setOnlineUsers((prev) => {
        const newUsers = new Map(prev);

        // Remove users who left
        removed.forEach((clientId: number) => {
          newUsers.delete(clientId.toString());
        });

        // Add or update users
        [...added, ...updated].forEach((clientId: number) => {
          const state = provider.awareness.getStates().get(clientId);
          if (state?.user && clientId !== provider.awareness.clientID) {
            newUsers.set(clientId.toString(), {
              id: state.user.id,
              name: state.user.name,
              color: state.user.color,
              cursor: state.cursor,
              selection: state.selection,
            });
          }
        });

        return newUsers;
      });
    };

    provider.awareness.on("change", awarenessChangeHandler);

    return () => {
      provider.awareness.off("change", awarenessChangeHandler);
    };
  }, [provider]);

  // Notify parent component when online users change
  useEffect(() => {
    onOnlineUsersChange?.(onlineUsers);
  }, [onlineUsers, onOnlineUsersChange]);

  // Update cursor position in awareness
  const updateCursorPosition = useCallback(
    (editor: any) => {
      if (!provider?.awareness) return;

      const position = editor.getPosition();
      if (position) {
        provider.awareness.setLocalStateField("cursor", {
          line: position.lineNumber,
          column: position.column,
        });
      }
    },
    [provider]
  );

  // Update selection in awareness
  const updateSelection = useCallback(
    (editor: any) => {
      if (!provider?.awareness) return;

      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        provider.awareness.setLocalStateField("selection", {
          startLine: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLine: selection.endLineNumber,
          endColumn: selection.endColumn,
        });
      } else {
        provider.awareness.setLocalStateField("selection", null);
      }
    },
    [provider]
  );

  // Create decorations for other users' cursors and selections
  useEffect(() => {
    if (!editor) return;

    const newDecorations: any[] = [];

    onlineUsers.forEach((user) => {
      // Add cursor decoration
      if (user.cursor) {
        newDecorations.push({
          range: new (window as any).monaco.Range(
            user.cursor.line,
            user.cursor.column,
            user.cursor.line,
            user.cursor.column
          ),
          options: {
            className: `remote-cursor-${user.id}`,
            stickiness: 1,
            beforeContentClassName: `remote-cursor-line-${user.id}`,
            afterContentClassName: "remote-cursor-label",
            after: {
              content: user.name,
              inlineClassName: "remote-cursor-name",
              inlineClassNameAffectsLetterSpacing: true,
            },
          },
        });
      }

      // Add selection decoration
      if (user.selection) {
        newDecorations.push({
          range: new (window as any).monaco.Range(
            user.selection.startLine,
            user.selection.startColumn,
            user.selection.endLine,
            user.selection.endColumn
          ),
          options: {
            className: "remote-selection",
            stickiness: 1,
            inlineClassName: `remote-selection-${user.id}`,
          },
        });
      }
    });

    const decorationIds = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
    decorationsRef.current = decorationIds;
  }, [editor, onlineUsers]);

  // this effect manages the lifetime of the editor binding
  useEffect(() => {
    if (provider == null || editor == null) {
      return;
    }

    const binding = new MonacoBinding(
      ydoc.getText(),
      editor.getModel()!,
      new Set([editor]),
      provider?.awareness
    );

    setBinding(binding);

    // Add event listeners for cursor and selection changes
    const cursorChangeDisposable = editor.onDidChangeCursorPosition(() => {
      updateCursorPosition(editor);
    });

    const selectionChangeDisposable = editor.onDidChangeCursorSelection(() => {
      updateSelection(editor);
    });

    return () => {
      binding.destroy();
      cursorChangeDisposable.dispose();
      selectionChangeDisposable.dispose();
    };
  }, [ydoc, provider, editor, updateCursorPosition, updateSelection]);

  // Add CSS styles for awareness features
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .remote-cursor-name {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        position: absolute;
        top: -20px;
        left: -2px;
        white-space: nowrap;
        z-index: 11;
      }
      
      .remote-selection {
        background: rgba(0, 123, 255, 0.2);
        border: 1px solid rgba(0, 123, 255, 0.4);
      }
      
      ${Array.from(onlineUsers.values())
        .map(
          (user) => `
        .remote-selection-${user.id} {
          background: ${user.color}40;
          border: 1px solid ${user.color}80;
        }
        
        .remote-cursor-line-${user.id} {
          border-left: 2px solid ${user.color} !important;
          position: absolute;
          height: 1.2em;
          z-index: 10;
        }
        
        .remote-cursor-${user.id} {
          background: ${user.color}20;
        }
      `
        )
        .join("")}
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [onlineUsers]);

  // Execute the code (only for JavaScript) and capture console output
  const executeCode = useCallback(() => {
    if (language !== "javascript" || !editor) return;

    const code = editor.getValue();
    const logs: string[] = [];

    const originalLog = console.log;
    (console as any).log = (...args: any[]) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ");
      logs.push(message);
      originalLog(...args);
    };

    try {
      // eslint-disable-next-line no-eval
      const result = eval(code);
      if (result !== undefined) {
        logs.push(String(result));
      }
    } catch (err: any) {
      logs.push(`Error: ${err.message || err}`);
    }

    (console as any).log = originalLog;

    setOutput(logs.join("\n"));
  }, [editor, language]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-800 p-2 flex justify-end">
        <button
          onClick={executeCode}
          disabled={language !== "javascript"}
          className="px-3 py-1 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          Run
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultValue={initialCode}
          defaultLanguage={language}
          onMount={(editor: any) => {
            setEditor(editor);
          }}
          options={{
            placeholder: "Start coding here...",
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            theme: "vs-dark",
            automaticLayout: true,
          }}
        />
      </div>

      {/* Output */}
      {language === "javascript" && (
        <div className="bg-gray-900 text-white p-2 h-40 overflow-auto border-t border-gray-700">
          <pre className="whitespace-pre-wrap text-sm">
            {output || "javascript output will appear here"}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CodeEditor;
