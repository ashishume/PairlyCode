import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionList as SessionListComponent } from "../components/SessionList";
import { CreateSessionModal } from "../components/CreateSessionModal";
import { apiService } from "../services/api.service";
import type { Session } from "../services/socket.service";

export const SessionListPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async (data: {
    name: string;
    description: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const session = await apiService.createSession(data);
      console.log("Created session:", session);
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
      console.log("Selected session:", session);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <SessionListComponent
          onSessionSelect={handleSessionSelect}
          onCreateSession={() => setShowCreateModal(true)}
        />

        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
          loading={loading}
        />

        {/* Error toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
