import type { AppSettings } from "@/lib/types";

// TDD Red Phase: Stub implementation
export function useSettings(): {
  settings: AppSettings | null;
  save: (settings: AppSettings) => Promise<void>;
  saving: boolean;
} {
  throw new Error("Not implemented");
}
