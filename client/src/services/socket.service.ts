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
  changes: any[];
  version: number;
}

export interface CodeUpdate {
  userId: string;
  firstName: string;
  lastName: string;
  code: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private registeredListeners = new Set<string>();
  private callbacks: { [key: string]: Function[] } = {};

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on("connect", () => {
      // console.log("Connected to server with ID:", this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      // console.log("Disconnected from server:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.handleReconnect();
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Add debug logging for all events
    this.socket.onAny((event, ...args) => {
      console.log(`Socket event received: ${event}`, args);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // console.log(
      //   `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      // );
      setTimeout(() => {
        this.socket?.connect();
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinSession(sessionId: string) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    // console.log("Socket service joining session:", sessionId);
    this.socket.emit("joinSession", { sessionId });
  }

  leaveSession(sessionId: string) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    // console.log("Socket service leaving session:", sessionId);
    this.socket.emit("leaveSession", { sessionId });
  }

  updateCursor(sessionId: string, position: CursorPosition) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    // console.log("Socket service updating cursor:", { sessionId, position });
    this.socket.emit("updateCursor", { sessionId, position });
  }

  sendCodeChange(sessionId: string, changes: any[], version: number) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    this.socket.emit("codeChange", {
      sessionId,
      changes,
      version,
      timestamp: Date.now(),
    });
  }

  sendCodeUpdate(userId: string, sessionId: string, code: string) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    this.socket.emit("updateCode", {
      userId,
      sessionId,
      code,
      timestamp: Date.now(),
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
    }) => void
  ) {
    if (!this.socket) return;
    this.socket.on("cursorUpdated", callback);
  }

  onCodeChanged(callback: (data: CodeChange) => void) {
    if (!this.socket) return;
    this.socket.on("codeChanged", (data) => {
      callback(data);
    });
  }

  onCodeUpdated(callback: (data: CodeUpdate) => void) {
    // console.log("onCodeUpdated method called");
    if (!this.socket) {
      // console.log("Socket not available for codeUpdated listener");
      return;
    }

    const eventName = "codeUpdated";
    // console.log("Event name:", eventName);
    // console.log("Registered listeners:", Array.from(this.registeredListeners));

    // Store the callback
    if (!this.callbacks[eventName]) {
      this.callbacks[eventName] = [];
    }
    this.callbacks[eventName].push(callback);
    // console.log(
    //   "Callbacks for",
    //   eventName,
    //   ":",
    //   this.callbacks[eventName].length
    // );

    // Only register the socket listener once
    if (!this.registeredListeners.has(eventName)) {
      // console.log("Registering codeUpdated listener");
      this.socket!.on(eventName, (data) => {
        // console.log("codeUpdated event received:", data);
        // Call all registered callbacks
        this.callbacks[eventName].forEach((cb) => cb(data));
      });
      this.registeredListeners.add(eventName);
      // console.log("codeUpdated listener added to registeredListeners");
    } else {
      // console.log("codeUpdated listener already registered, adding callback");
    }
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

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get current socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Emit a test event to check connectivity
  ping() {
    if (!this.socket) return;
    this.socket.emit("ping", { timestamp: Date.now() });
  }
}

export const socketService = new SocketService();
