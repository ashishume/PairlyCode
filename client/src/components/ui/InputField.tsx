import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
interface InputFieldProps {
  id: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url";
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
  icon?: LucideIcon;
  error?: string;
  className?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  name,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  icon: Icon,
  error,
  className = "",
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className={`group space-y-3 ${className}`}>
      <label
        htmlFor={id}
        className={`block text-sm font-semibold text-white transition-colors duration-200 ${
          isFocused ? "text-blue-300" : ""
        }`}
      >
        {label}
        {required && <span className="text-red-300 ml-1">*</span>}
      </label>

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Icon
              className={`h-5 w-5 transition-all duration-200 ${
                isFocused ? "text-blue-300 scale-110" : "text-white/70"
              }`}
            />
          </div>
        )}

        <input
          id={id}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full ${Icon ? "pl-14" : "pl-5"} ${
            type === "password" ? "pr-14" : "pr-5"
          } py-5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:border-white/30 ${
            error
              ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50"
              : ""
          } ${isFocused ? "shadow-lg shadow-blue-500/20" : ""}`}
          placeholder={placeholder}
        />

        {type === "password" && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-5 flex items-center text-white/70 hover:text-white transition-all duration-200 hover:scale-110"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-200 flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 backdrop-blur-sm">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
          <span className="font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};
