import React, { useState } from "react";
import MonacoEditor from "./MonacoEditor";

interface CodeEditorProps {
  initialValue?: string;
  language?: string;
  height?: string;
  width?: string;
  readOnly?: boolean;
  showControls?: boolean;
  onCodeChange?: (code: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
  { value: "markdown", label: "Markdown" },
];

const THEMES = [
  { value: "vs-dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "hc-black", label: "High Contrast" },
];

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialValue = "",
  language = "javascript",
  height = "500px",
  width = "100%",
  readOnly = false,
  showControls = true,
  onCodeChange,
}) => {
  const [code, setCode] = useState(initialValue);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedTheme, setSelectedTheme] = useState<
    "vs-dark" | "light" | "hc-black"
  >("vs-dark");

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedLanguage(event.target.value);
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTheme(event.target.value as "vs-dark" | "light" | "hc-black");
  };

  return (
    <div className="w-full">
      {showControls && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border">
          <div className="flex items-center gap-2">
            <label htmlFor="language-select" className="text-sm font-medium">
              Language:
            </label>
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="theme-select" className="text-sm font-medium">
              Theme:
            </label>
            <select
              id="theme-select"
              value={selectedTheme}
              onChange={handleThemeChange}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {THEMES.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>

          {readOnly && (
            <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
              Read Only
            </span>
          )}
        </div>
      )}

      <div className="border rounded-b-lg overflow-hidden">
        <MonacoEditor
          value={code}
          onChange={handleCodeChange}
          language={selectedLanguage}
          theme={selectedTheme}
          height={height}
          width={width}
          readOnly={readOnly}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            folding: true,
            foldingStrategy: "indentation",
            showFoldingControls: "always",
            selectOnLineNumbers: true,
            contextmenu: true,
            mouseWheelZoom: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
