import type { AppSettings, Region, Result } from "@/lib/types";
import type { Settings } from "@/lib/contract";
import { fail, ok } from "@/lib/errors";
import { readSettings, writeSettings } from "@/lib/storage";

const CONTRACT_SETTINGS_KEY = "gmc:contractSettings";

const DEFAULT_CONTRACT_SETTINGS: Settings = {
  currency: "KRW",
  categoryFilters: [],
};

function readContractSettings(): Settings {
  try {
    const raw = localStorage.getItem(CONTRACT_SETTINGS_KEY);
    if (raw === null) return { ...DEFAULT_CONTRACT_SETTINGS };
    return { ...DEFAULT_CONTRACT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_CONTRACT_SETTINGS };
  }
}

const REWARD_UNLOCK_DURATION_MS = 86400000;

const VALID_REGIONS: readonly Region[] = [
  "seoul",
  "gyeonggi",
  "incheon",
  "busan",
  "daegu",
  "daejeon",
  "gwangju",
  "ulsan",
  "sejong",
  "gangwon",
  "chungbuk",
  "chungnam",
  "jeonbuk",
  "jeonnam",
  "gyeongbuk",
  "gyeongnam",
  "jeju",
];

function isValidRegion(value: unknown): value is Region {
  return typeof value === "string" && (VALID_REGIONS as readonly string[]).includes(value);
}

export function getSettings(): AppSettings {
  return readSettings();
}

export function saveSettings(partial: Partial<AppSettings>): Result<AppSettings> {
  if (partial.defaultRegion !== undefined && !isValidRegion(partial.defaultRegion)) {
    return fail(422);
  }

  const next: AppSettings = { ...getSettings(), ...partial };

  const result = writeSettings(next);
  if (!result.ok) return result;
  return ok(next);
}

export function unlockReward(now: number): Result<AppSettings> {
  return saveSettings({ rewardUnlockedUntil: now + REWARD_UNLOCK_DURATION_MS });
}

export function isRewardUnlocked(now: number): boolean {
  const { rewardUnlockedUntil } = getSettings();
  if (rewardUnlockedUntil === null) return false;
  return now < rewardUnlockedUntil;
}

/** contract.ts의 updateSettingsFn 구현 — 리워드 해제 시각/카테고리 필터 등 범용 설정 저장소 */
export function updateSettings(partial: Partial<Settings>): Settings {
  const next: Settings = { ...readContractSettings(), ...partial };
  try {
    localStorage.setItem(CONTRACT_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // 쓰기 실패해도 병합된 값은 그대로 반환 — 계약 시그니처가 Result가 아니라 Settings이므로
    // 실패를 표현할 채널이 없다(호출부가 재조회 시 이전 값으로 자연 롤백된다).
  }
  return next;
}
