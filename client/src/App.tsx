import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { SessionListPage } from "./pages/SessionList";
import { ActiveSession } from "./pages/ActiveSession";
import "./App.scss";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pair-programming" element={<SessionListPage />} />
          <Route path="/session/:sessionId" element={<ActiveSession />} />
          <Route
            path="/"
            element={<Navigate to="/pair-programming" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
