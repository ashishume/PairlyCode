import { io, Socket } from "socket.io-client";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cursorPosition?: any;
}

export interface Session {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  language: string;
  code: string;
  status: string;
  roomId: string;
  host: User;
  hostId: string;
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface CodeChange {
  userId: string;
  firstName: string;
  lastName: string;
  changes: {
    range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
    text: string;
  }[];
  version: number;
  timestamp?: number;
}

export interface CodeUpdate {
  userId: string;
  firstName: string;
  lastName: string;
  code: string;
  timestamp?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  socketId?: string;
  latency?: number;
  reconnectAttempts: number;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private registeredListeners = new Set<string>();
  private callbacks: { [key: string]: Function[] } = {};
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnectAttempts: 0,
  };
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    this.socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Connected to server with ID:", this.socket?.id);
      this.connectionStatus.connected = true;
      this.connectionStatus.socketId = this.socket?.id;
      this.connectionStatus.reconnectAttempts = 0;
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason);
      this.connectionStatus.connected = false;

      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.connectionStatus.connected = false;
      this.handleReconnect();
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    this.socket.on("connected", (data) => {
      console.log("Connection acknowledged:", data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connectionStatus.reconnectAttempts = this.reconnectAttempts;

      console.log(
        `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => {
        this.socket?.connect();
      }, 1000 * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionStatus.connected = false;
    this.connectionStatus.socketId = undefined;
    this.registeredListeners.clear();
    this.callbacks = {};
  }

  async joinSession(
    sessionId: string
  ): Promise<{ success: boolean; error?: string; participantsCount?: number }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket!.emit("joinSession", { sessionId }, (response: any) => {
        if (response?.success) {
          console.log("Successfully joined session:", sessionId);
          resolve({
            success: true,
            participantsCount: response.participantsCount,
          });
        } else {
          console.error("Failed to join session:", response?.error);
          resolve({
            success: false,
            error: response?.error || "Failed to join session",
          });
        }
      });
    });
  }

  async leaveSession(
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket!.emit("leaveSession", { sessionId }, (response: any) => {
        if (response?.success) {
          console.log("Successfully left session:", sessionId);
          resolve({ success: true });
        } else {
          console.error("Failed to leave session:", response?.error);
          resolve({
            success: false,
            error: response?.error || "Failed to leave session",
          });
        }
      });
    });
  }

  async updateCursor(
    sessionId: string,
    position: CursorPosition
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "updateCursor",
        { sessionId, position },
        (response: any) => {
          if (response?.success) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: response?.error || "Failed to update cursor",
            });
          }
        }
      );
    });
  }

  async sendCodeUpdate(
    userId: string,
    sessionId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "updateCode",
        {
          userId,
          sessionId,
          code,
          timestamp: Date.now(),
        },
        (response: any) => {
          if (response?.success) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: response?.error || "Failed to update code",
            });
          }
        }
      );
    });
  }

  async sendCodeChange(
    sessionId: string,
    changes: {
      range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      };
      text: string;
    }[],
    version: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket!.emit(
        "codeChange",
        {
          sessionId,
          changes,
          version,
          timestamp: Date.now(),
        },
        (response: any) => {
          if (response?.success) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: response?.error || "Failed to send code change",
            });
          }
        }
      );
    });
  }

  async ping(): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      const timestamp = Date.now();
      this.socket!.emit("ping", { timestamp }, (response: any) => {
        if (response?.success) {
          resolve({
            success: true,
            latency: response.latency || Date.now() - timestamp,
          });
        } else {
          resolve({
            success: false,
            error: response?.error || "Ping failed",
          });
        }
      });
    });
  }

  async getSessionInfo(sessionId: string): Promise<{
    success: boolean;
    session?: any;
    participants?: Participant[];
    error?: string;
  }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket!.emit("getSessionInfo", { sessionId }, (response: any) => {
        if (response?.success) {
          resolve({
            success: true,
            session: response.session,
            participants: response.participants,
          });
        } else {
          resolve({
            success: false,
            error: response?.error || "Failed to get session info",
          });
        }
      });
    });
  }

  async getConnectedClients(): Promise<{
    success: boolean;
    connectedClients?: number;
    activeRooms?: number;
    error?: string;
  }> {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket!.emit("getConnectedClients", {}, (response: any) => {
        if (response?.success) {
          resolve({
            success: true,
            connectedClients: response.connectedClients,
            activeRooms: response.activeRooms,
          });
        } else {
          resolve({
            success: false,
            error: response?.error || "Failed to get connected clients",
          });
        }
      });
    });
  }

  onUserJoined(
    callback: (data: { user: User; participants: Participant[] }) => void
  ) {
    if (!this.socket) return;
    this.socket.on("userJoined", callback);
  }

  onUserLeft(
    callback: (data: {
      userId: string;
      firstName: string;
      lastName: string;
      timestamp?: number;
    }) => void
  ) {
    if (!this.socket) return;
    this.socket.on("userLeft", callback);
  }

  onSessionJoined(
    callback: (data: { session: Session; participants: Participant[] }) => void
  ) {
    if (!this.socket) return;
    this.socket.on("sessionJoined", callback);
  }

  onCursorUpdated(
    callback: (data: {
      userId: string;
      firstName: string;
      lastName: string;
      position: CursorPosition;
      timestamp?: number;
    }) => void
  ) {
    if (!this.socket) return;
    this.socket.on("cursorUpdated", callback);
  }

  onCodeChanged(callback: (data: CodeChange) => void) {
    if (!this.socket) return;
    this.socket.on("codeChanged", callback);
  }

  onCodeUpdated(callback: (data: CodeUpdate) => void) {
    if (!this.socket) return;
    this.socket.on("codeUpdated", callback);
  }

  onError(callback: (data: { message: string }) => void) {
    if (!this.socket) return;
    this.socket.on("error", callback);
  }

  off(event: string) {
    if (!this.socket) {
      // console.log("Socket not available for off:", event);
      return;
    }
    // console.log("Removing listener for event:", event);
    this.socket.off(event);
    this.registeredListeners.delete(event);
    delete this.callbacks[event];
  }

  // Remove all listeners for a specific event
  removeAllListeners(event: string) {
    if (!this.socket) return;
    this.socket.removeAllListeners(event);
  }

  onPong(
    callback: (data: {
      timestamp: number;
      serverTime: number;
      latency?: number;
    }) => void
  ) {
    if (!this.socket) return;
    this.socket.on("pong", callback);
  }

  // Get connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  // Get current socket ID
  getSocketId(): string | undefined {
    return this.connectionStatus.socketId;
  }

  // Get room information
  async getRoomInfo(
    sessionId: string
  ): Promise<{ success: boolean; roomSize?: number; error?: string }> {
    if (!this.socket) {
      return { success: false, error: "Socket not connected" };
    }

    return new Promise((resolve) => {
      this.socket!.emit("getSessionInfo", { sessionId }, (response: any) => {
        if (response?.success) {
          resolve({
            success: true,
            roomSize: response.participants?.length || 0,
          });
        } else {
          resolve({
            success: false,
            error: response?.error || "Failed to get room info",
          });
        }
      });
    });
  }

  // Force reconnection
  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Get all registered event listeners
  getRegisteredListeners(): string[] {
    return Array.from(this.registeredListeners);
  }

  // Clear all callbacks for a specific event
  clearCallbacks(event: string) {
    if (this.callbacks[event]) {
      this.callbacks[event] = [];
    }
  }

  // Get callback count for an event
  getCallbackCount(event: string): number {
    return this.callbacks[event]?.length || 0;
  }

  // Clean up all listeners and callbacks
  cleanupAllListeners() {
    if (!this.socket) return;

    // Remove all socket listeners
    this.socket.off("codeChanged");
    this.socket.off("codeUpdated");
    this.socket.off("userJoined");
    this.socket.off("userLeft");
    this.socket.off("cursorUpdated");
    this.socket.off("sessionJoined");
    this.socket.off("error");
    this.socket.off("pong");
    this.socket.off("connected");
    this.socket.off("disconnect");
    this.socket.off("connect_error");

    // Clear all callbacks
    this.callbacks = {};
    this.registeredListeners.clear();
  }
}

export const socketService = new SocketService();
