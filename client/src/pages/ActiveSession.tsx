import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiService } from "../services/api.service";
import {
  useSessionStore,
  useCurrentSession,
  useSessionLoading,
  useSessionError,
  useToken,
  useUser,
} from "../stores";
import CodeEditor from "../components/CodeEditor";
import Header from "@/components/Header";

export const ActiveSession: React.FC = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Zustand store state
  const { setCurrentSession, setLoading, setError } = useSessionStore();

  // Zustand selectors
  const currentSession = useCurrentSession();
  const loading = useSessionLoading();
  const error = useSessionError();
  const token = useToken();
  const currentUser = useUser();
  // Load session from URL parameter if present
  useEffect(() => {
    if (urlSessionId) {
      loadSessionFromUrl(urlSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionId]);

  const loadSessionFromUrl = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const session = await apiService.getSession(sessionId);
      setCurrentSession(session);
    } catch (err) {
      setError("Failed to load session");
      console.error("Error loading session:", err);
      // Redirect back to sessions list if session not found
      navigate("/pair-programming");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSessions = () => {
    navigate("/pair-programming");
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button
            onClick={handleBackToSessions}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-gray-500 text-xl mb-4">Session not found</div>
          <button
            onClick={handleBackToSessions}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <Header
        handleBackToSessions={handleBackToSessions}
        currentSession={currentSession}
      />
      {/* Editor */}
      <div className="flex-1">
        {currentSession.code && (
          <CodeEditor
            sessionId={currentSession._id || ""}
            initialCode={currentSession.code || "// Start coding here...\n"}
            language={currentSession.language || "javascript"}
            currentUser={{
              id: currentUser?.id || "",
              name: currentUser?.firstName + " " + currentUser?.lastName || "",
            }}
          />
        )}
      </div>
    </div>
  );
};
