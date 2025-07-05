import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { PairProgramming } from "./pages/PairProgramming";
import "./App.scss";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pair-programming" element={<PairProgramming />} />
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
