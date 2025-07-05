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

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
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

    console.log("Socket service joining session:", sessionId);
    this.socket.emit("joinSession", { sessionId });
  }

  leaveSession(sessionId: string) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    console.log("Socket service leaving session:", sessionId);
    this.socket.emit("leaveSession", { sessionId });
  }

  updateCursor(sessionId: string, position: CursorPosition) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    console.log("Socket service updating cursor:", { sessionId, position });
    this.socket.emit("updateCursor", { sessionId, position });
  }

  sendCodeChange(sessionId: string, changes: any[], version: number) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    console.log("Sending code change:", { sessionId, changes, version });
    this.socket.emit("codeChange", { sessionId, changes, version });
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
      console.log("Socket received codeChanged event:", data);
      callback(data);
    });
  }

  onError(callback: (data: { message: string }) => void) {
    if (!this.socket) return;
    this.socket.on("error", callback);
  }

  off(event: string) {
    if (!this.socket) return;
    this.socket.off(event);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
