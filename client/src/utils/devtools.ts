import { devtools } from "zustand/middleware";

// DevTools configuration for Zustand stores
export const devtoolsConfig = {
  name: "pairlycode-stores",
  enabled: process.env.NODE_ENV === "development",
  anonymousActionType: "unknown",
  serialize: {
    options: {
      // Enable better serialization for complex objects
      replacer: (key: string, value: any) => {
        // Handle circular references
        if (typeof value === "object" && value !== null) {
          try {
            JSON.stringify(value);
            return value;
          } catch {
            return "[Circular]";
          }
        }
        return value;
      },
    },
  },
};

// Helper function to create devtools middleware with consistent configuration
export const createDevtoolsMiddleware = (storeName: string) =>
  devtools(
    (set, get, api) => ({
      set: (partial: any, replace?: boolean) => {
        set(partial, replace as any);
        // Log state changes in development
        if (process.env.NODE_ENV === "development") {
          // console.log(`[${storeName}] State updated:`, get());
        }
      },
      get,
      api,
    }),
    {
      name: storeName,
      enabled: process.env.NODE_ENV === "development",
    }
  );
