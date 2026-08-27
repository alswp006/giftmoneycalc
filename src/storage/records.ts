import type { HistoryRecord, StorageResult } from "@/lib/types";
import { readEnvelope, writeEnvelope } from "@/storage/envelope";
import { SCHEMA_VERSION, STORAGE_KEYS } from "@/storage/keys";
import type { RecordsEnvelope } from "@/storage/keys";
import { newUuid } from "@/storage/uuid";

const MAX_RECORDS = 500;

const REQUIRED_FIELDS = [
  "eventType",
  "relation",
  "amount",
  "recommendedAmount",
  "attended",
  "companions",
  "eventDate",
  "ruleVersion",
] as const;

type SaveRecordInput = Omit<HistoryRecord, "id" | "createdAt" | "updatedAt">;
type UpdateRecordPatch = Partial<Omit<HistoryRecord, "id" | "createdAt">>;

function emptyEnvelope(): RecordsEnvelope {
  return { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), records: [] };
}

async function readRecords(): Promise<HistoryRecord[]> {
  const result = await readEnvelope<RecordsEnvelope>(STORAGE_KEYS.records, emptyEnvelope());
  if (!result.ok) return [];
  return Array.isArray(result.value.records) ? result.value.records : [];
}

async function writeRecords(records: HistoryRecord[]): Promise<StorageResult<null>> {
  const result = await writeEnvelope<RecordsEnvelope>(STORAGE_KEYS.records, {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    records,
  });
  if (!result.ok) {
    return { ok: false, code: result.code === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "CORRUPTED" };
  }
  return { ok: true, value: null };
}

export async function saveRecord(input: SaveRecordInput): Promise<StorageResult<HistoryRecord>> {
  for (const field of REQUIRED_FIELDS) {
    const value = (input as Record<string, unknown>)[field];
    if (value === undefined || value === null) {
      return { ok: false, code: "INVALID_RECORD", field };
    }
  }

  const records = await readRecords();
  if (records.length >= MAX_RECORDS) {
    return { ok: false, code: "RECORD_LIMIT_EXCEEDED" };
  }

  const now = new Date().toISOString();
  const record: HistoryRecord = {
    ...input,
    id: newUuid(),
    createdAt: now,
    updatedAt: now,
  };

  const writeResult = await writeRecords([...records, record]);
  if (!writeResult.ok) return writeResult;

  return { ok: true, value: record };
}

export async function updateRecord(id: string, patch: UpdateRecordPatch): Promise<StorageResult<HistoryRecord>> {
  const records = await readRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) {
    return { ok: false, code: "INVALID_RECORD", field: "id" };
  }

  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safePatch } = patch as Record<string, unknown>;
  const original = records[index];
  const updated: HistoryRecord = {
    ...original,
    ...safePatch,
    id: original.id,
    createdAt: original.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = [...records];
  nextRecords[index] = updated;

  const writeResult = await writeRecords(nextRecords);
  if (!writeResult.ok) return writeResult;

  return { ok: true, value: updated };
}

export async function deleteRecord(id: string): Promise<StorageResult<null>> {
  const records = await readRecords();
  const nextRecords = records.filter((r) => r.id !== id);
  return writeRecords(nextRecords);
}

export async function listRecords(): Promise<StorageResult<HistoryRecord[]>> {
  const records = await readRecords();
  return { ok: true, value: records };
}
