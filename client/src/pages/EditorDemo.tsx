import React, { useState } from "react";
import CodeEditor from "@/components/ui/CodeEditor";

const EditorDemo: React.FC = () => {
  const [currentTab, setCurrentTab] = useState("javascript");

  const codeExamples = {
    javascript: `// JavaScript Example
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log("Sorted array:", bubbleSort([...numbers]));`,

    typescript: `// TypeScript Example
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getActiveUsers(): User[] {
    return this.users.filter(user => user.isActive);
  }
}

const userService = new UserService();
userService.addUser({
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  isActive: true
});`,

    python: `# Python Example
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)

# Example usage
numbers = [3, 6, 8, 10, 1, 2, 1]
sorted_numbers = quick_sort(numbers)
print(f"Original: {numbers}")
print(f"Sorted: {sorted_numbers}")

# List comprehension example
squares = [x**2 for x in range(10)]
print(f"Squares: {squares}")`,

    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monaco Editor Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .button {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .button:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Monaco Editor</h1>
        <p>This is a powerful code editor built with Monaco Editor.</p>
        <button class="button" onclick="alert('Hello from Monaco!')">
            Click me!
        </button>
    </div>
</body>
</html>`,

    css: `/* CSS Example */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
}

/* Modern Card Component */
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 20px 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.card-header {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--dark-color);
  margin-bottom: 10px;
}

.card-body {
  color: var(--secondary-color);
  line-height: 1.6;
}

/* Responsive Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
}

/* Button Styles */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}`,

    json: `{
  "name": "pairly-code",
  "version": "1.0.0",
  "description": "A collaborative code editor built with Monaco Editor",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.27",
    "@types/react-dom": "^18.0.10",
    "@vitejs/plugin-react": "^3.1.0",
    "typescript": "^4.9.4",
    "vite": "^4.1.0"
  },
  "keywords": [
    "monaco-editor",
    "react",
    "typescript",
    "code-editor",
    "collaborative"
  ],
  "author": "Your Name",
  "license": "MIT"
}`,
  };

  const tabs = [
    { id: "javascript", label: "JavaScript" },
    { id: "typescript", label: "TypeScript" },
    { id: "python", label: "Python" },
    { id: "html", label: "HTML" },
    { id: "css", label: "CSS" },
    { id: "json", label: "JSON" },
  ];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Monaco Editor Demo</h1>
        <p className="text-gray-600 mb-8">
          Experience the power of Monaco Editor with syntax highlighting,
          IntelliSense, and more.
        </p>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Editor */}
        <CodeEditor
          initialValue={codeExamples[currentTab as keyof typeof codeExamples]}
          language={currentTab}
          height="600px"
          showControls={true}
          onCodeChange={(code) => {
            console.log(`${currentTab} code changed:`, code);
          }}
        />

        {/* Features Section */}
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Syntax Highlighting</h3>
            <p className="text-gray-600">
              Full syntax highlighting support for 50+ programming languages.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">IntelliSense</h3>
            <p className="text-gray-600">
              Smart code completion, parameter hints, and error detection.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Multiple Themes</h3>
            <p className="text-gray-600">
              Choose from dark, light, and high contrast themes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Code Folding</h3>
            <p className="text-gray-600">
              Collapse and expand code blocks for better organization.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Search & Replace</h3>
            <p className="text-gray-600">
              Powerful search functionality with regex support.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Multi-cursor</h3>
            <p className="text-gray-600">
              Edit multiple lines simultaneously with multi-cursor support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorDemo;
