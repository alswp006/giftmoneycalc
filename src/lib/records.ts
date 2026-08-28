// Placeholder for records domain implementation
// This will be implemented per packet-0004 specification

import type { GiftRecord, Result } from "@/lib/types";

export function createRecord(
  input: unknown,
  opts?: { force?: boolean },
): Result<GiftRecord> {
  throw new Error("Not implemented");
}

export function updateRecord(
  id: string,
  patch: unknown,
  baseUpdatedAt: number,
): Result<GiftRecord> {
  throw new Error("Not implemented");
}

export function deleteRecord(id: string): Result<void> {
  throw new Error("Not implemented");
}

export function subscribeRecords(
  cb: (records: GiftRecord[]) => void,
): () => void {
  throw new Error("Not implemented");
}
