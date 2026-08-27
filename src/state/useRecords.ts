import { useContext } from "react";
import { RecordsContext, type RecordsContextValue } from "@/state/RecordsProvider";

export function useRecords(): RecordsContextValue {
  const ctx = useContext(RecordsContext);
  if (!ctx) {
    throw new Error("useRecords() must be called within a RecordsProvider");
  }
  return ctx;
}
