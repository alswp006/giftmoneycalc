import type { StorageResult } from "@/lib/types";
import { readEnvelope, writeEnvelope } from "@/storage/envelope";
import { SCHEMA_VERSION, STORAGE_KEYS } from "@/storage/keys";
import type { RewardEnvelope, SettingsEnvelope } from "@/storage/keys";

export type Settings = Record<string, unknown>;
type SettingsStorage = SettingsEnvelope & Settings;

function emptySettingsEnvelope(): SettingsStorage {
  return { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() };
}

export async function getSettings(): Promise<Settings> {
  const result = await readEnvelope<SettingsStorage>(STORAGE_KEYS.settings, emptySettingsEnvelope());
  if (!result.ok) return {};
  const { schemaVersion: _schemaVersion, updatedAt: _updatedAt, ...rest } = result.value;
  return rest;
}

export async function setSettings(patch: Settings): Promise<StorageResult<null>> {
  const current = await getSettings();
  const result = await writeEnvelope<SettingsStorage>(STORAGE_KEYS.settings, {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    ...current,
    ...patch,
  });
  if (!result.ok) {
    return { ok: false, code: result.code === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "CORRUPTED" };
  }
  return { ok: true, value: null };
}

function emptyRewardEnvelope(): RewardEnvelope {
  return { schemaVersion: SCHEMA_VERSION, lastUnlockedAt: NaN };
}

export async function getReward(): Promise<number | null> {
  const result = await readEnvelope<RewardEnvelope>(STORAGE_KEYS.reward, emptyRewardEnvelope());
  if (!result.ok) return null;
  const { lastUnlockedAt } = result.value;
  if (typeof lastUnlockedAt !== "number" || Number.isNaN(lastUnlockedAt)) {
    return null;
  }
  return lastUnlockedAt;
}

export async function setRewardUnlockedNow(): Promise<StorageResult<null>> {
  const result = await writeEnvelope<RewardEnvelope>(STORAGE_KEYS.reward, {
    schemaVersion: SCHEMA_VERSION,
    lastUnlockedAt: Date.now(),
  });
  if (!result.ok) {
    return { ok: false, code: result.code === "QUOTA_EXCEEDED" ? "QUOTA_EXCEEDED" : "CORRUPTED" };
  }
  return { ok: true, value: null };
}

export async function isOnboarded(): Promise<boolean> {
  try {
    return localStorage.getItem(STORAGE_KEYS.onboard) === "1";
  } catch {
    return false;
  }
}

export async function setOnboarded(): Promise<StorageResult<null>> {
  try {
    localStorage.setItem(STORAGE_KEYS.onboard, "1");
    return { ok: true, value: null };
  } catch {
    return { ok: false, code: "QUOTA_EXCEEDED" };
  }
}
