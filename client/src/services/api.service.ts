import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface CreateSessionData {
  name: string;
  description?: string;
  language: string;
  code: string;
}

export interface UpdateSessionData {
  name?: string;
  description?: string;
  language?: string;
  code?: string;
}

export const apiService = {
  // Auth
  async login(data: LoginData) {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  // Sessions
  async createSession(data: CreateSessionData) {
    const response = await api.post("/sessions", data);
    return response.data;
  },

  async getSessions() {
    const response = await api.get("/sessions");
    return response.data;
  },

  async getSession(id: string) {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },

  async updateSession(id: string, data: UpdateSessionData) {
    const response = await api.patch(`/sessions/${id}`, data);
    return response.data;
  },

  async endSession(id: string) {
    const response = await api.delete(`/sessions/${id}`);
    return response.data;
  },

  async deleteSession(id: string) {
    const response = await api.delete(`/sessions/${id}/delete`);
    return response.data;
  },

  // Users
  async getUsers() {
    const response = await api.get("/users");
    return response.data;
  },

  async getUser(id: string) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async getActiveParticipants(id: string) {
    const response = await api.get(`/sessions/${id}/participants`);
    return response.data;
  },
};

export default api;
