import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionList as SessionListComponent } from "../components/SessionList";
import { CreateSessionModal } from "../components/CreateSessionModal";
import { apiService } from "../services/api.service";
import type { Session } from "../stores/collaborativeEditorStore";
import { useSessionStore, useAuthStore, useUser } from "../stores";
import Header from "@/components/Header";

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
      <Header
        handleBackToSessions={() => {}}
        onlineUsers={new Map()}
        currentSession={{
          id: user?.id || "",
          name: user?.firstName + " " + user?.lastName || "",
        }}
        handleLogout={handleLogout}
        showLogout={true}
        showUsers={false}
      />

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
