import React, { useEffect, useState } from "react";
import { socketService } from "../services/socket.service";
import type { ConnectionStatus } from "../services/socket.service";

export const ConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0,
  });
  const [messages, setMessages] = useState<string[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [roomInfo, setRoomInfo] = useState<{
    roomSize?: number;
    error?: string;
  }>({});

  useEffect(() => {
    const checkConnection = () => {
      const status = socketService.getConnectionStatus();
      setConnectionStatus(status);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendTestMessage = async () => {
    if (socketService.isConnected()) {
      try {
        const result = await socketService.ping();
        if (result.success) {
          setLatency(result.latency || null);
          setMessages((prev) => [
            ...prev,
            `Ping successful! Latency: ${result.latency}ms`,
          ]);
        } else {
          setMessages((prev) => [...prev, `Ping failed: ${result.error}`]);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ]);
      }
    }
  };

  const getConnectedClients = async () => {
    try {
      const result = await socketService.getConnectedClients();
      if (result.success) {
        setMessages((prev) => [
          ...prev,
          `Connected clients: ${result.connectedClients}, Active rooms: ${result.activeRooms}`,
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          `Failed to get client info: ${result.error}`,
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
    }
  };

  const forceReconnect = () => {
    socketService.forceReconnect();
    setMessages((prev) => [...prev, "Forcing reconnection..."]);
  };

  const getRegisteredListeners = () => {
    const listeners = socketService.getRegisteredListeners();
    setMessages((prev) => [
      ...prev,
      `Registered listeners: ${listeners.join(", ")}`,
    ]);
  };

  useEffect(() => {
    socketService.onPong((data) => {
      const calculatedLatency = Date.now() - data.timestamp;
      setLatency(calculatedLatency);
      setMessages((prev) => [
        ...prev,
        `Pong received! Latency: ${calculatedLatency}ms`,
      ]);
    });
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold mb-2">Socket.IO Connection Test</h3>

      {/* Connection Status */}
      <div className="flex items-center space-x-2 mb-3">
        <div
          className={`w-3 h-3 rounded-full ${
            connectionStatus.connected ? "bg-green-500" : "bg-red-500"
          }`}
        ></div>
        <span className="text-sm">
          {connectionStatus.connected ? "Connected" : "Disconnected"}
        </span>
        {connectionStatus.socketId && (
          <span className="text-xs text-gray-400">
            ID: {connectionStatus.socketId.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Connection Details */}
      <div className="text-xs text-gray-300 mb-3 space-y-1">
        <div>Reconnect attempts: {connectionStatus.reconnectAttempts}</div>
        {latency && <div>Latency: {latency}ms</div>}
        {roomInfo.roomSize !== undefined && (
          <div>Room size: {roomInfo.roomSize}</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={sendTestMessage}
          className="w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Send Ping
        </button>

        <button
          onClick={getConnectedClients}
          className="w-full px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
        >
          Get Client Info
        </button>

        <button
          onClick={forceReconnect}
          className="w-full px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
        >
          Force Reconnect
        </button>

        <button
          onClick={getRegisteredListeners}
          className="w-full px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
        >
          Show Listeners
        </button>
      </div>

      {/* Messages */}
      <div className="mt-3 max-h-32 overflow-y-auto">
        {messages.slice(-5).map((msg, index) => (
          <div
            key={index}
            className="text-xs text-gray-300 border-b border-gray-700 pb-1 mb-1"
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};
