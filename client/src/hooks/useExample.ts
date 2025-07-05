import { useState } from "react";

export function useExample() {
  const [value, setValue] = useState(0);
  return { value, setValue };
}
