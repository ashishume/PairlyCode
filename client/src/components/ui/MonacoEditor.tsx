import React from "react";
import Editor from "@monaco-editor/react";
import type { OnMount, BeforeMount } from "@monaco-editor/react";

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: "vs-dark" | "light" | "hc-black";
  height?: string;
  width?: string;
  readOnly?: boolean;
  options?: any;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = "javascript",
  theme = "vs-dark",
  height = "400px",
  width = "100%",
  readOnly = false,
  options = {},
}) => {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // You can access the editor instance here
    console.log("Editor mounted");
  };

  const handleEditorWillMount: BeforeMount = (monaco) => {
    // You can configure Monaco before it's mounted
    console.log("Editor will mount");
  };

  const defaultOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: "on",
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: "on",
    ...options,
  };

  return (
    <Editor
      height={height}
      width={width}
      language={language}
      theme={theme}
      value={value}
      onChange={onChange}
      onMount={handleEditorDidMount}
      beforeMount={handleEditorWillMount}
      options={{ ...defaultOptions, readOnly }}
    />
  );
};

export default MonacoEditor;
