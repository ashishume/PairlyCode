import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import { CollaborativeEditor } from "../components/CollaborativeEditor";
import { socketService } from "../services/socket.service";
import { apiService } from "../services/api.service";
import { ArrowLeft, Settings, Users } from "lucide-react";
import {
  useSessionStore,
  useCurrentSession,
  useSessionLoading,
  useSessionError,
  useToken,
} from "../stores";
import TestEditor from "@/components/TestEditor";

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

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (token) {
      socketService.connect(token);
    }
  }, [token]);

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

      // Join the session via WebSocket
      socketService.joinSession(sessionId);
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
      <div className="bg-gray-800 text-white p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToSessions}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Sessions</span>
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <div>
              <h1 className="text-xl font-semibold">{currentSession.name}</h1>
              <p className="text-sm text-gray-400">
                {currentSession.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <Users className="w-4 h-4" />
              <span>
                {currentSession.participants?.length || 0} participants
              </span>
            </div>
            <button className="p-2 text-gray-300 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        {currentSession.code && (
          <TestEditor
            sessionId={currentSession._id || ""}
            initialCode={currentSession.code || "// Start coding here...\n"}
            language={currentSession.language || "javascript"}
            participants={currentSession.participants || []}
          />
        )}
        {/* <CollaborativeEditor
          sessionId={currentSession._id || ""}
          initialCode={currentSession.code || "// Start coding here...\n"}
          language={currentSession.language || "javascript"}
          participants={currentSession.participants || []}
        /> */}
      </div>
    </div>
  );
};
