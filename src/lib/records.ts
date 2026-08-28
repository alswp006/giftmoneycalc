import type { EventType, GiftRecord, Relationship, Result } from "@/lib/types";
import { fail, ok } from "@/lib/errors";
import { readRecords, writeRecords } from "@/lib/storage";

const RECORDS_KEY = "gmc:records";
const MAX_ID_ATTEMPTS = 3;
const DEFAULT_RELATIONSHIP: Relationship = "acquaintance";

export type CreateRecordInput = Omit<
  GiftRecord,
  "id" | "createdAt" | "updatedAt" | "relationship"
> & { relationship?: Relationship };

export type UpdateRecordPatch = Partial<
  Omit<GiftRecord, "id" | "createdAt" | "updatedAt">
>;

export type RecordFilter = {
  eventType?: EventType;
  relationship?: Relationship;
  personName?: string;
  startDate?: string;
  endDate?: string;
};

type Listener = (records: GiftRecord[]) => void;
const listeners = new Set<Listener>();

function notify(records: GiftRecord[]): void {
  for (const listener of listeners) {
    listener(records);
  }
}

function isDuplicate(
  records: GiftRecord[],
  personName: string,
  eventDate: string,
  eventType: GiftRecord["eventType"],
): boolean {
  return records.some(
    (r) =>
      r.personName === personName &&
      r.eventDate === eventDate &&
      r.eventType === eventType,
  );
}

function generateUniqueId(existingIds: Set<string>): string | null {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
    const id = crypto.randomUUID();
    if (!existingIds.has(id)) return id;
  }
  return null;
}

export function createRecord(
  input: CreateRecordInput,
  opts?: { force?: boolean },
): Result<GiftRecord> {
  const records = readRecords();

  if (
    !opts?.force &&
    isDuplicate(records, input.personName, input.eventDate, input.eventType)
  ) {
    return fail(409);
  }

  const id = generateUniqueId(new Set(records.map((r) => r.id)));
  if (id === null) {
    return fail(409);
  }

  const now = Date.now();
  const record: GiftRecord = {
    ...input,
    relationship: input.relationship ?? DEFAULT_RELATIONSHIP,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const next = [...records, record];
  const writeResult = writeRecords(next);
  if (!writeResult.ok) return writeResult;

  notify(next);
  return ok(record);
}

export function updateRecord(
  id: string,
  patch: UpdateRecordPatch,
  baseUpdatedAt: number,
): Result<GiftRecord> {
  const records = readRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return fail(404);

  const existing = records[index];
  if (existing.updatedAt !== baseUpdatedAt) return fail(409);

  const updated: GiftRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Math.max(Date.now(), existing.updatedAt + 1),
  };

  const next = [...records];
  next[index] = updated;
  const writeResult = writeRecords(next);
  if (!writeResult.ok) return writeResult;

  notify(next);
  return ok(updated);
}

export function deleteRecord(id: string): Result<void> {
  const records = readRecords();
  const exists = records.some((r) => r.id === id);
  if (!exists) return fail(404);

  const next = records.filter((r) => r.id !== id);
  const writeResult = writeRecords(next);
  if (!writeResult.ok) return writeResult;

  notify(next);
  return ok(undefined);
}

export function queryRecords(filter?: RecordFilter): GiftRecord[] {
  const records = readRecords();
  const filtered = filter
    ? records.filter((r) => {
        if (filter.eventType && r.eventType !== filter.eventType) return false;
        if (filter.relationship && r.relationship !== filter.relationship) {
          return false;
        }
        if (
          filter.personName &&
          !r.personName.includes(filter.personName)
        ) {
          return false;
        }
        if (filter.startDate && r.eventDate < filter.startDate) return false;
        if (filter.endDate && r.eventDate > filter.endDate) return false;
        return true;
      })
    : records;

  return [...filtered].sort((a, b) => {
    if (a.eventDate !== b.eventDate) return b.eventDate.localeCompare(a.eventDate);
    return b.createdAt - a.createdAt;
  });
}

export function subscribeRecords(cb: Listener): () => void {
  listeners.add(cb);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== RECORDS_KEY) return;
    try {
      const parsed = event.newValue
        ? (JSON.parse(event.newValue) as GiftRecord[])
        : [];
      cb(Array.isArray(parsed) ? parsed : []);
    } catch {
      cb([]);
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", handleStorage);
  };
}
