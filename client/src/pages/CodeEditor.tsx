import { useState } from "react";
import CodeEditor from "@/components/ui/CodeEditor";

function CodeEditorPage() {
  const [code, setCode] = useState(`// Start writing your code here`);

  return (
    <div className="p-8">
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Advanced Code Editor</h2>
        <p className="text-gray-600 mb-4">
          This version includes language selection, theme switching, and
          enhanced features.
        </p>

        <CodeEditor
          initialValue={code}
          language="typescript"
          height="400px"
          onCodeChange={(newCode) => setCode(newCode)}
        />
      </div>
    </div>
  );
}

export default CodeEditorPage;
