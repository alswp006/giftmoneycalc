import { readEnvelope, writeEnvelope } from "@/storage/envelope";
import { newUuid } from "@/storage/uuid";
import { STORAGE_KEYS } from "@/storage/keys";
import type { HistoryRecord, StorageResult } from "@/lib/types";
import type { RecordsEnvelope } from "@/storage/keys";

const RECORD_LIMIT = 500;
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

function isoNow(): string {
  return new Date().toISOString();
}

function validateRecord(input: Partial<HistoryRecord>): { ok: true } | { ok: false; field: string } {
  for (const field of REQUIRED_FIELDS) {
    const value = input[field as keyof typeof input];
    if (value === undefined || value === null) {
      return { ok: false, field };
    }
  }
  return { ok: true };
}

export async function saveRecord(
  input: Partial<HistoryRecord>
): Promise<StorageResult<HistoryRecord>> {
  const validation = validateRecord(input);
  if (!validation.ok) {
    return {
      ok: false,
      code: "INVALID_RECORD",
      field: validation.field,
    };
  }

  const fallback: RecordsEnvelope = {
    schemaVersion: 1,
    updatedAt: isoNow(),
    records: [],
  };

  const envelope = await readEnvelope(STORAGE_KEYS.records, fallback);
  if (!envelope.ok) {
    return { ok: false, code: envelope.code };
  }

  const records = envelope.value.records;

  if (records.length >= RECORD_LIMIT) {
    return { ok: false, code: "RECORD_LIMIT_EXCEEDED" };
  }

  const now = isoNow();
  const record: HistoryRecord = {
    id: newUuid(),
    eventType: input.eventType!,
    relation: input.relation!,
    amount: input.amount!,
    recommendedAmount: input.recommendedAmount!,
    attended: input.attended!,
    companions: input.companions!,
    eventDate: input.eventDate!,
    ruleVersion: input.ruleVersion!,
    counterpartLabel: input.counterpartLabel,
    memo: input.memo,
    createdAt: now,
    updatedAt: now,
  };

  records.push(record);

  const updated: RecordsEnvelope = {
    ...envelope.value,
    updatedAt: now,
    records,
  };

  const writeResult = await writeEnvelope(STORAGE_KEYS.records, updated);
  if (!writeResult.ok) {
    return { ok: false, code: writeResult.code };
  }

  return { ok: true, value: record };
}

export async function updateRecord(
  id: string,
  patch: Partial<HistoryRecord>
): Promise<StorageResult<HistoryRecord>> {
  const fallback: RecordsEnvelope = {
    schemaVersion: 1,
    updatedAt: isoNow(),
    records: [],
  };

  const envelope = await readEnvelope(STORAGE_KEYS.records, fallback);
  if (!envelope.ok) {
    return { ok: false, code: envelope.code };
  }

  const records = envelope.value.records;
  const recordIndex = records.findIndex((r) => r.id === id);

  if (recordIndex === -1) {
    return { ok: false, code: "CORRUPTED" };
  }

  const existing = records[recordIndex];
  const now = isoNow();

  const updated: HistoryRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  records[recordIndex] = updated;

  const writeResult = await writeEnvelope(STORAGE_KEYS.records, {
    ...envelope.value,
    updatedAt: now,
    records,
  });

  if (!writeResult.ok) {
    return { ok: false, code: writeResult.code };
  }

  return { ok: true, value: updated };
}

export async function deleteRecord(id: string): Promise<StorageResult<void>> {
  const fallback: RecordsEnvelope = {
    schemaVersion: 1,
    updatedAt: isoNow(),
    records: [],
  };

  const envelope = await readEnvelope(STORAGE_KEYS.records, fallback);
  if (!envelope.ok) {
    return { ok: false, code: envelope.code };
  }

  const records = envelope.value.records;
  const filtered = records.filter((r) => r.id !== id);

  const now = isoNow();
  const writeResult = await writeEnvelope(STORAGE_KEYS.records, {
    ...envelope.value,
    updatedAt: now,
    records: filtered,
  });

  if (!writeResult.ok) {
    return { ok: false, code: writeResult.code };
  }

  return { ok: true, value: undefined };
}

export async function listRecords(): Promise<StorageResult<HistoryRecord[]>> {
  const fallback: RecordsEnvelope = {
    schemaVersion: 1,
    updatedAt: isoNow(),
    records: [],
  };

  const envelope = await readEnvelope(STORAGE_KEYS.records, fallback);
  if (!envelope.ok) {
    return { ok: true, value: [] };
  }

  return { ok: true, value: envelope.value.records };
}
