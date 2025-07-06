import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CollaborativeEditor } from "../components/CollaborativeEditor";
import { socketService } from "../services/socket.service";
import { apiService } from "../services/api.service";
import type { Session, Participant, User } from "../services/socket.service";
import { ArrowLeft, Settings, Users } from "lucide-react";

export const ActiveSession: React.FC = () => {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      window.location.href = "/login";
      return;
    }

    // Connect to WebSocket
    socketService.connect(token);
  }, []);

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

  const handleLeaveSession = () => {
    if (currentSession) {
      const sessionId = currentSession.id || currentSession._id;
      if (sessionId) {
        socketService.leaveSession(sessionId);
      }
    }
    setCurrentSession(null);
    setParticipants([]);
    navigate("/pair-programming");
  };

  // Set up WebSocket listeners
  useEffect(() => {
    const handleSessionJoined = (data: {
      session: Session;
      participants: Participant[];
    }) => {
      setCurrentSession(data.session);
      setParticipants(data.participants);
    };

    const handleUserJoined = (data: {
      user: User;
      participants: Participant[];
    }) => {
      setParticipants(data.participants);
    };

    const handleUserLeft = (data: {
      userId: string;
      firstName: string;
      lastName: string;
    }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    socketService.onSessionJoined(handleSessionJoined);
    socketService.onUserJoined(handleUserJoined);
    socketService.onUserLeft(handleUserLeft);
    socketService.onError(handleError);

    return () => {
      socketService.off("sessionJoined");
      socketService.off("userJoined");
      socketService.off("userLeft");
      socketService.off("error");
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Show loading state when loading session from URL
  if (loading && urlSessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Session header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveSession}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sessions</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentSession.name}
              </h1>
              {currentSession.description && (
                <p className="text-sm text-gray-500">
                  {currentSession.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{participants.length} participants</span>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <CollaborativeEditor
          sessionId={currentSession.id || currentSession._id || ""}
          participants={participants}
          language={currentSession.language || "javascript"}
          initialCode={
            currentSession.code ||
            "// Welcome to your collaborative coding session!\n// Start coding with your team...\n\nfunction hello() {\n  console.log('Hello, World!');\n}"
          }
        />
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};
