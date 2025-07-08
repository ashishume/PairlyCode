import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { socketService, type Participant } from "@/services/socket.service";
import { useCollaborativeEditorStore } from "@/stores";

const TestEditor = ({
  sessionId,
  initialCode,
  language,
}: {
  sessionId: string;
  initialCode: string;
  language: string;
  participants: Participant[];
}) => {
  const { currentUserId, setCurrentUserId } = useCollaborativeEditorStore();
  const isReceivingRemoteChange = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const editorRef = useRef<any>(null);
  const [version, setVersion] = useState(0);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Set initial code if provided
    if (initialCode) {
      editor.setValue(initialCode);
    }

    // Listen for content changes and send incremental changes
    editor.onDidChangeModelContent((e: any) => {
      if (!isReceivingRemoteChange.current) {
        const changes = e.changes;
        if (changes && changes.length > 0) {
          const newVersion = version + 1;
          setVersion(newVersion);

          // Send incremental changes instead of full code
          socketService
            .sendCodeChange(sessionId, changes, newVersion)
            .catch(console.error);
        }
      }
    });
  };

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

  // Listen for remote incremental changes
  useEffect(() => {
    const handleCodeChanged = (data: any) => {
      // Only apply changes from other users
      if (data.userId !== currentUserId && editorRef.current) {
        isReceivingRemoteChange.current = true;

        try {
          const model = editorRef.current.getModel();
          if (model && data.changes) {
            // Apply incremental changes
            const edits = data.changes.map((change: any) => ({
              range: change.range,
              text: change.text,
            }));

            model.applyEdits(edits);

            // Update version
            if (data.version > version) {
              setVersion(data.version);
            }
          }
        } catch (error) {
          console.error("Error applying remote changes:", error);
        } finally {
          setTimeout(() => {
            isReceivingRemoteChange.current = false;
          }, 10);
        }
      }
    };

    const handleCodeUpdated = (data: any) => {
      // Handle full code updates (fallback)
      if (data.userId !== currentUserId && editorRef.current) {
        isReceivingRemoteChange.current = true;

        try {
          editorRef.current.setValue(data.code);
        } catch (error) {
          console.error("Error applying code update:", error);
        } finally {
          setTimeout(() => {
            isReceivingRemoteChange.current = false;
          }, 10);
        }
      }
    };

    socketService.onCodeChanged(handleCodeChanged);
    socketService.onCodeUpdated(handleCodeUpdated);

    // Store cleanup function
    cleanupRef.current = () => {
      socketService.off("codeChanged");
      socketService.off("codeUpdated");
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [currentUserId, version]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up all socket listeners
      socketService.cleanupAllListeners();

      // Leave the session
      socketService.leaveSession(sessionId).catch(console.error);
    };
  }, [sessionId]);

  return (
    <Editor
      height="100vh"
      width="100vw"
      defaultLanguage={language}
      defaultValue={initialCode}
      theme="vs-dark"
      onMount={handleEditorDidMount}
    />
  );
};

export default TestEditor;
