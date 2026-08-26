import type {
  Direction,
  EventType,
  GiftRecord,
  LastCalc,
  RelationType,
  RewardUnlock,
  Settings,
  WriteResult,
} from "@/lib/types";
import {
  DEFAULT_REWARD_UNLOCK,
  DEFAULT_SETTINGS,
  RECORD_LIMIT,
  STORAGE_KEYS,
} from "@/lib/constants";

type AddRecordResult =
  | { ok: true; id: string }
  | { ok: false; reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR" };

function safeSet(key: string, value: unknown): WriteResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, reason: "QUOTA_EXCEEDED" };
  }
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  let value: T = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  safeSet(key, value);
  return value;
}

export function getRecords(): GiftRecord[] {
  return readJson<GiftRecord[]>(STORAGE_KEYS.records, []);
}

export function addRecord(
  personName: string,
  eventType: EventType,
  relation: RelationType,
  amount: number,
  date: string,
  direction: Direction,
  memo: string
): AddRecordResult {
  const records = getRecords();
  if (records.length >= RECORD_LIMIT) {
    return { ok: false, reason: "LIMIT_REACHED" };
  }

  const record: GiftRecord = {
    id: crypto.randomUUID(),
    personName,
    eventType,
    relation,
    amount,
    date,
    direction,
    memo,
    createdAt: Date.now(),
  };

  const result = safeSet(STORAGE_KEYS.records, [...records, record]);
  if (!result.ok) return result;
  return { ok: true, id: record.id };
}

export function deleteRecord(id: string): WriteResult {
  const records = getRecords().filter((r) => r.id !== id);
  return safeSet(STORAGE_KEYS.records, records);
}

export function getSettings(): Settings {
  return readJson<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): WriteResult {
  return safeSet(STORAGE_KEYS.settings, settings);
}

export function getLastCalc(): LastCalc | null {
  return readJson<LastCalc | null>(STORAGE_KEYS.lastCalc, null);
}

export function saveLastCalc(lastCalc: LastCalc): WriteResult {
  return safeSet(STORAGE_KEYS.lastCalc, lastCalc);
}

export function getRewardUnlock(): RewardUnlock {
  return readJson<RewardUnlock>(STORAGE_KEYS.rewardUnlock, DEFAULT_REWARD_UNLOCK);
}

export function saveRewardUnlock(unlock: RewardUnlock): WriteResult {
  return safeSet(STORAGE_KEYS.rewardUnlock, unlock);
}

export function clearAllData(): void {
  safeSet(STORAGE_KEYS.records, []);
  safeSet(STORAGE_KEYS.lastCalc, null);
  safeSet(STORAGE_KEYS.rewardUnlock, DEFAULT_REWARD_UNLOCK);
}
