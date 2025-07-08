import { useEffect } from "react";
import { useAuthStore } from "../stores";

export const useAuthInit = () => {
  const { setUser, setToken, setAuthenticated, setInitialized } =
    useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setUser(user);
        setToken(token);
        setAuthenticated(true);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        // Clear invalid data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
      }
    }

    // Always mark as initialized after checking localStorage
    setInitialized(true);
  }, [setUser, setToken, setAuthenticated, setInitialized]);
};
