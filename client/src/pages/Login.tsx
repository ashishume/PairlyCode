import React, { useState, useEffect } from "react";
import { apiService } from "../services/api.service";
import { Link, useNavigate } from "react-router-dom";
import { Code, Sparkles, Mail, Lock } from "lucide-react";
import { InputField } from "../components/ui/InputField";
import { useAuthStore, useAuthLoading, useAuthError } from "../stores";
import pairlyCodeLogo from "../assets/pairly-code.png";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Zustand store state
  const { login, setLoading, setError } = useAuthStore();

  // Zustand selectors
  const loading = useAuthLoading();
  const error = useAuthError();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiService.login({ email, password });

      // Use Zustand store to handle login
      login(response.user, response.access_token);

      // Redirect to pair programming
      navigate("/pair-programming");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#30565b] flex items-center justify-center p-4">
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div
          className={`max-w-lg w-full space-y-8 transform transition-all duration-1000 ease-out ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center items-center mb-6">
              <img
                src={pairlyCodeLogo}
                alt="PairlyCode"
                className="h-16 w-auto rounded-full"
              />
            </div>

            <h2 className="text-4xl font-bold text-white">Welcome back</h2>
            <p className="text-white/80 text-lg">
              Sign in to continue your coding journey
            </p>
            <p className="text-sm text-white/60">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-blue-300 hover:text-blue-200 transition-colors duration-200 underline decoration-blue-300/30 hover:decoration-blue-200/50"
              >
                Create one now
              </Link>
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl backdrop-blur-sm animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-ping"></div>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <InputField
                  id="email"
                  name="email"
                  type="email"
                  label="Email address"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  icon={Mail}
                />

                <InputField
                  id="password"
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  icon={Lock}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${
                  loading
                    ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                    : "bg-black text-white hover:bg-gray-800 shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
