import React, { useEffect, useState } from "react";
import { apiService } from "../services/api.service";
import type { Session, User } from "../stores/collaborativeEditorStore";
import {
  Plus,
  Users,
  Clock,
  Play,
  Pause,
  Square,
  Code,
  Trash2,
} from "lucide-react";
import {
  useSessionStore,
  useSessions,
  useSessionLoading,
  useSessionError,
} from "../stores";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";

interface SessionListProps {
  onSessionSelect: (session: Session) => void;
  onCreateSession: () => void;
  currentUser: User | null;
}

export const SessionList: React.FC<SessionListProps> = ({
  onSessionSelect,
  onCreateSession,
  currentUser,
}) => {
  // Zustand store state
  const { setSessions, setLoading, setError, removeSession } =
    useSessionStore();

  // Zustand selectors
  const sessions = useSessions();
  const loading = useSessionLoading();
  const error = useSessionError();

  // Local state for delete confirmation
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSessions();
      setSessions(data);
    } catch (err) {
      setError("Failed to load sessions");
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (session: Session, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent session selection
    setSessionToDelete(session);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    const sessionId = sessionToDelete._id || sessionToDelete.id || "";
    if (!sessionId) {
      setError("Session ID not found");
      return;
    }

    try {
      setDeletingSessionId(sessionId);
      await apiService.deleteSession(sessionId);

      // Remove from local state
      removeSession(sessionId);
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch (err) {
      setError("Failed to delete session");
      console.error("Error deleting session:", err);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  // Helper function to check if current user is the host of a session
  const isSessionHost = (session: Session): boolean => {
    if (!currentUser) return false;
    return (
      session.hostId === currentUser.id || session.host?.id === currentUser.id
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="w-4 h-4 text-green-500" />;
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case "ended":
        return <Square className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "paused":
        return "Paused";
      case "ended":
        return "Ended";
      default:
        return "Unknown";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={loadSessions}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Sessions</h2>
          <p className="text-gray-400 mt-1">
            Join an existing session or create a new one
          </p>
        </div>
        <button
          onClick={onCreateSession}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Session</span>
        </button>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No sessions yet
          </h3>
          <p className="text-gray-400 mb-6">
            Create your first collaborative coding session
          </p>
          <button
            onClick={onCreateSession}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer relative group"
              onClick={() => onSessionSelect(session)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {session.name}
                  </h3>
                  {session.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {session.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {getStatusIcon(session.status)}
                  <span className="text-xs text-gray-400">
                    {getStatusText(session.status)}
                  </span>
                </div>
              </div>

              {/* Delete button - only visible on hover for session hosts */}
              {isSessionHost(session) && (
                <button
                  onClick={(e) => handleDeleteClick(session, e)}
                  disabled={deletingSessionId === (session._id || session.id)}
                  className="absolute bottom-2 right-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50"
                  title="Delete session"
                >
                  {deletingSessionId === (session._id || session.id) ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>
                      {session.participants?.length || 0} participants
                    </span>
                  </div>
                  <div className="text-gray-400">
                    {formatDate(session.createdAt)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                    {session.language}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Session"
        message={`Are you sure you want to delete "${sessionToDelete?.name}"? This action cannot be undone.`}
        loading={deletingSessionId !== null}
      />
    </div>
  );
};
