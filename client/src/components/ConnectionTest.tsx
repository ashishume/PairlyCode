import React, { useEffect, useState } from "react";
import { socketService } from "../services/socket.service";

export const ConnectionTest: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const checkConnection = () => {
      const connected = socketService.isConnected();
      setIsConnected(connected);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendTestMessage = () => {
    if (socketService.isConnected()) {
      socketService.ping();
      setMessages((prev) => [
        ...prev,
        `Sent ping at ${new Date().toLocaleTimeString()}`,
      ]);
    }
  };

  useEffect(() => {
    socketService.onPong((data) => {
      const latency = Date.now() - data.timestamp;
      setMessages((prev) => [...prev, `Pong received! Latency: ${latency}ms`]);
    });
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50">
      <h3 className="font-bold mb-2">Connection Test</h3>
      <div className="flex items-center space-x-2 mb-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        ></div>
        <span className="text-sm">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <button
        onClick={sendTestMessage}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
      >
        Send Test
      </button>
      <div className="mt-2 max-h-32 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className="text-xs text-gray-300">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};
