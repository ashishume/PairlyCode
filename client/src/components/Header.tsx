import {
  ArrowLeft,
  Settings,
  Users,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import pairlyCodeLogo from "../assets/pairly-code.png";

interface User {
  id: string;
  name: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

const Header = ({
  handleBackToSessions,
  currentSession,
  onlineUsers = new Map<string, User>(),
  currentUser,
  handleLogout,
  showLogout = false,
  showUsers = false,
}: {
  handleBackToSessions: () => void;
  currentSession: any;
  onlineUsers?: Map<string, User>;
  currentUser?: {
    id: string;
    name: string;
    color?: string;
  };
  handleLogout: () => void;
  showLogout?: boolean;
  showUsers?: boolean;
}) => {
  const [showUserList, setShowUserList] = useState(false);
  return (
    <div className="bg-gray-800 text-white p-4 border-b border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* PairlyCode Logo */}
          <div className="flex items-center">
            <img src={pairlyCodeLogo} alt="PairlyCode" className="h-8 w-auto" />
          </div>

          {showUsers && (
            <>
              <div className="h-6 w-px bg-gray-600"></div>
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
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Active Users Indicator */}
          {showUsers && (
            <div className="flex items-center gap-2 justify-center relative">
              {/* Main indicator button */}
              <button
                onClick={() => setShowUserList(!showUserList)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {onlineUsers.size + (currentUser ? 1 : 0)}
                </span>
                {showUserList ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* User avatars */}
              <div className="flex -space-x-2">
                {/* Current user */}
                {currentUser && (
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-semibold text-white shadow-lg"
                    style={{ backgroundColor: currentUser.color || "#6B7280" }}
                    title={`${currentUser.name} (You)`}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Other users */}
                {Array.from(onlineUsers.values())
                  .slice(0, 3)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-semibold text-white shadow-lg"
                      style={{ backgroundColor: user.color }}
                      title={user.name}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}

                {/* Show more indicator */}
                {onlineUsers.size > 3 && (
                  <div
                    className="w-8 h-8 rounded-full bg-gray-600 border-2 border-gray-800 flex items-center justify-center text-xs font-semibold text-white shadow-lg"
                    title={`${onlineUsers.size - 3} more users`}
                  >
                    +{onlineUsers.size - 3}
                  </div>
                )}
              </div>

              {/* User list dropdown */}
              {showUserList && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Active Users
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {/* Current user */}
                    {currentUser && (
                      <div className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white mr-3"
                          style={{
                            backgroundColor: currentUser.color || "#6B7280",
                          }}
                        >
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {currentUser.name}
                          </div>
                          <div className="text-xs text-gray-500">You</div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}

                    {/* Other users */}
                    {Array.from(onlineUsers.values()).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white mr-3"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500">Online</div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showLogout && (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
