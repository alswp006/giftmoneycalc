import type { AppSettings, GiftRecord, Result } from "@/lib/types";
import { fail, ok } from "@/lib/errors";

const RECORDS_KEY = "gmc:records";
const SETTINGS_KEY = "gmc:settings";
const MAX_RECORDS = 1000;

const DEFAULT_SETTINGS: AppSettings = {
  defaultRegion: "seoul",
  inflationAdjustDefault: false,
  rewardUnlockedUntil: null,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): Result<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return ok(undefined);
  } catch (err) {
    const code = err instanceof Error && err.name === "QuotaExceededError" ? 507 : 500;
    return fail(code);
  }
}

export function readRecords(): GiftRecord[] {
  const data = readJson<GiftRecord[]>(RECORDS_KEY, []);
  return Array.isArray(data) ? data : [];
}

export function writeRecords(records: GiftRecord[]): Result<void> {
  // Guard is cumulative (previously stored count + incoming), not just incoming.length —
  // required by the packet-0003 spec so repeated appends can't creep past MAX_RECORDS
  // even though this call fully replaces the stored array on success.
  if (readRecords().length + records.length > MAX_RECORDS) {
    return fail(413);
  }
  return writeJson(RECORDS_KEY, records);
}

export function readSettings(): AppSettings {
  const data = readJson<Partial<AppSettings> | null>(SETTINGS_KEY, null);
  return data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
}

export function writeSettings(settings: AppSettings): Result<void> {
  return writeJson(SETTINGS_KEY, settings);
}

export function clearAll(): Result<void> {
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    return ok(undefined);
  } catch {
    return fail(507);
  }
}
