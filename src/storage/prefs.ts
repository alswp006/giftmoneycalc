import { readEnvelope, writeEnvelope } from "@/storage/envelope";
import { STORAGE_KEYS } from "@/storage/keys";
import type { RewardEnvelope } from "@/storage/keys";
import type { StorageResult } from "@/lib/types";

function isoNow(): string {
  return new Date().toISOString();
}

export async function getReward(): Promise<number | null> {
  const fallback: RewardEnvelope = {
    schemaVersion: 1,
    lastUnlockedAt: NaN,
  };

  const result = await readEnvelope(STORAGE_KEYS.reward, fallback);

  if (!result.ok) {
    return null;
  }

  const value = result.value.lastUnlockedAt;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export async function setRewardUnlockedNow(): Promise<StorageResult<void>> {
  const fallback: RewardEnvelope = {
    schemaVersion: 1,
    lastUnlockedAt: NaN,
  };

  const now = Date.now();
  const envelope: RewardEnvelope = {
    schemaVersion: 1,
    lastUnlockedAt: now,
  };

  const result = await writeEnvelope(STORAGE_KEYS.reward, envelope);

  if (!result.ok) {
    return { ok: false, code: result.code };
  }

  return { ok: true, value: undefined };
}

export async function isOnboarded(): Promise<boolean> {
  const value = localStorage.getItem(STORAGE_KEYS.onboard);
  return value === "1";
}

export async function setOnboarded(): Promise<StorageResult<void>> {
  try {
    localStorage.setItem(STORAGE_KEYS.onboard, "1");
    return { ok: true, value: undefined };
  } catch (err) {
    if (err instanceof Error && err.name === "QuotaExceededError") {
      return { ok: false, code: "QUOTA_EXCEEDED" };
    }
    return { ok: false, code: "CORRUPTED" };
  }
}

export async function getSettings(): Promise<Record<string, unknown>> {
  // TODO: implement settings storage
  return {};
}

export async function setSettings(settings: Record<string, unknown>): Promise<StorageResult<void>> {
  // TODO: implement settings storage
  return { ok: true, value: undefined };
}
