import { ArrowLeft, Settings, Users } from "lucide-react";

const Header = ({
  handleBackToSessions,
  currentSession,
}: {
  handleBackToSessions: () => void;
  currentSession: any;
}) => {
  return (
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
            <span>{currentSession.participants?.length || 0} participants</span>
          </div>
          <button className="p-2 text-gray-300 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
