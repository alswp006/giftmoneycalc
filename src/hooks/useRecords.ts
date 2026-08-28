import type { GiftRecord } from "@/lib/types";

// TDD Red Phase: Stub implementation
export function useRecords(): {
  records: GiftRecord[];
  loading: boolean;
  reload: () => void;
} {
  throw new Error("Not implemented");
}
