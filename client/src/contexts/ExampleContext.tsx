import { createContext, useContext } from "react";

export const ExampleContext = createContext<string | undefined>(undefined);

export function useExampleContext() {
  return useContext(ExampleContext);
}
