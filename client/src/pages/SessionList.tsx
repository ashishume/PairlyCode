import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionList as SessionListComponent } from "../components/SessionList";
import { CreateSessionModal } from "../components/CreateSessionModal";
import { apiService } from "../services/api.service";
import type { Session } from "../stores/collaborativeEditorStore";
import { LogOut, User } from "lucide-react";
import { useSessionStore, useAuthStore, useUser } from "../stores";

export const SessionListPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Zustand store state
  const { setLoading, setError } = useSessionStore();
  const { logout } = useAuthStore();

  // Zustand selectors
  const user = useUser();

  const handleCreateSession = async (data: {
    name: string;
    description: string;
    language: string;
    code: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const session = await apiService.createSession(data);
      // console.log("Created session:", session);
      setShowCreateModal(false);

      // Navigate to the new session
      const sessionId = session.id || session._id;
      if (!sessionId) {
        throw new Error("Session ID not found");
      }
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError("Failed to create session");
      console.error("Error creating session:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSelect = async (session: Session) => {
    try {
      setError(null);
      // console.log("Selected session:", session);

      // Navigate to the session
      const sessionId = session.id || session._id;
      if (!sessionId) {
        throw new Error("Session ID not found");
      }
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError("Failed to join session");
      console.error("Error joining session:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">PairlyCode</h1>
              <div className="h-6 w-px bg-gray-600"></div>
              <div className="flex items-center space-x-2 text-gray-300">
                <User className="w-4 h-4" />
                <span>
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <SessionListComponent
          onSessionSelect={handleSessionSelect}
          onCreateSession={() => setShowCreateModal(true)}
          currentUser={user}
        />

        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
          loading={false}
        />
      </div>
    </div>
  );
};
