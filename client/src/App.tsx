import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.scss";
import Home from "@/pages/Home";
import EditorDemo from "@/pages/EditorDemo";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor-demo" element={<EditorDemo />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
