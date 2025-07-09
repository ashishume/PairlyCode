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
import { useAuthInit } from "./hooks/useAuthInit";
import { useIsAuthenticated, useIsInitialized } from "./stores";

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  const isInitialized = useIsInitialized();

  // Show loading while auth is being initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route component (redirects to pair-programming if already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useIsAuthenticated();
  const isInitialized = useIsInitialized();

  // Show loading while auth is being initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/pair-programming" replace />;
  }

  return <>{children}</>;
};

function App() {
  // Initialize auth from localStorage
  useAuthInit();

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/pair-programming"
            element={
              <ProtectedRoute>
                <SessionListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session/:sessionId"
            element={
              <ProtectedRoute>
                <ActiveSession />
              </ProtectedRoute>
            }
          />
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
