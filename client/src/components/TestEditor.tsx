import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { socketService, type Participant } from "@/services/socket.service";
import { useCollaborativeEditorStore } from "@/stores";

const TestEditor = ({
  sessionId,
  initialCode,
  language,
  participants,
}: {
  sessionId: string;
  initialCode: string;
  language: string;
  participants: Participant[];
}) => {
  const [code, setCode] = useState(initialCode);
  const { currentUserId, setCurrentUserId } = useCollaborativeEditorStore();
  const isReceivingRemoteChange = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleEditorDidMount = (editor: any) => {
    editor.onDidChangeModelContent(() => {
      if (!isReceivingRemoteChange.current) {
        const newCode = editor.getValue();
        setCode(newCode);
      }
    });
  };

  useEffect(() => {
    if (!isReceivingRemoteChange.current) {
      socketService.sendCodeChange(sessionId, code, 1);
    }
  }, [code, sessionId]);

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

  // Listen for remote code changes
  useEffect(() => {
    const handleCodeChanged = (data: any) => {
      // Only apply changes from other users
      if (data.userId !== currentUserId) {
        isReceivingRemoteChange.current = true;
        setCode(data.code);
        setTimeout(() => {
          isReceivingRemoteChange.current = false;
        }, 10);
      }
    };

    socketService.onCodeChanged(handleCodeChanged);

    // Store cleanup function
    cleanupRef.current = () => {
      socketService.off("codeChanged");
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [currentUserId]);

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
      defaultLanguage="javascript"
      defaultValue="// Add your code here"
      theme="vs-dark"
      onMount={handleEditorDidMount}
      value={code}
    />
  );
};

export default TestEditor;
