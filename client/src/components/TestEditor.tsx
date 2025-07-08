import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useParams } from "react-router-dom";
// import { useCollaborativeEditorStore } from "@/stores";

export const TestEditor = () => {
  const [code, setCode] = useState("");

  //   const {
  //     setSessionId,
  //     setConnectionStatus,
  //     setCurrentUserId,
  //     setParticipants,
  //     addCursor,
  //     removeCursor,
  //     setApplyingRemoteChanges,
  //     updateVersion,
  //     updateLastSentVersion,
  //   } = useCollaborativeEditorStore();
  const handleEditorDidMount = (editor: any) => {
    editor.onDidChangeModelContent(() => {
      setCode(editor.getValue());
    });
  };

  const params = useParams();
  const sessionId = params.sessionId;
  console.log(code);

  return (
    <Editor
      height="100vh"
      width="100vw"
      defaultLanguage="javascript"
      defaultValue="// some comment"
      theme="vs-dark"
      onMount={handleEditorDidMount}
      //   path={`/session/${sessionId}`}
    />
  );
};
