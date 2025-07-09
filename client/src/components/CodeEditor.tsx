import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";

// const roomname = `monaco-react-demo-${new Date().toLocaleDateString("en-CA")}`;

function CodeEditor({
  sessionId,
  initialCode,
  language,
  participants,
}: {
  sessionId: string;
  initialCode: string;
  language: string;
  participants: any[];
}) {
  const ydoc = useMemo(() => new Y.Doc(), []);
  const [editor, setEditor] = useState<any | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [, setBinding] = useState<MonacoBinding | null>(null);

  // this effect manages the lifetime of the Yjs document and the provider
  useEffect(() => {
    const provider = new WebsocketProvider(
      "ws://localhost:1234",
      sessionId,
      ydoc
    );
    setProvider(provider);
    return () => {
      provider?.destroy();
      ydoc.destroy();
    };
  }, [ydoc]);

  // this effect manages the lifetime of the editor binding
  useEffect(() => {
    if (provider == null || editor == null) {
      return;
    }
    console.log("reached", provider);
    const binding = new MonacoBinding(
      ydoc.getText(),
      editor.getModel()!,
      new Set([editor]),
      provider?.awareness
    );
    setBinding(binding);
    return () => {
      binding.destroy();
    };
  }, [ydoc, provider, editor]);

  console.log("participants", participants);

  return (
    <Editor
      height="90vh"
      defaultValue={initialCode}
      defaultLanguage={language}
      onMount={(editor: any) => {
        setEditor(editor);
      }}
    />
  );
}

export default CodeEditor;
