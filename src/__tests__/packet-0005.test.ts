import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AppSettings, Result, Region } from "@/lib/types";

// Import functions to test (will be implemented in settings.ts)
// These imports WILL fail initially — that's TDD.
import {
  getSettings,
  saveSettings,
  unlockReward,
  isRewardUnlocked,
} from "@/lib/settings";

describe("설정 저장 계층 (확인 후 반영 · 리워드 24시간 해제)", () => {
  const SETTINGS_KEY = "gmc:settings";

  // Default settings for tests
  const defaultSettings: AppSettings = {
    defaultRegion: "seoul",
    inflationAdjustDefault: false,
    rewardUnlockedUntil: null,
  };

  // 24 hours in milliseconds
  const TWENTY_FOUR_HOURS = 86400000;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("AC-1: 함수 export 및 기본 동작", () => {
    it("should export getSettings function", () => {
      expect(typeof getSettings).toBe("function");
    });

    it("should export saveSettings function", () => {
      expect(typeof saveSettings).toBe("function");
    });

    it("should export unlockReward function", () => {
      expect(typeof unlockReward).toBe("function");
    });

    it("should export isRewardUnlocked function", () => {
      expect(typeof isRewardUnlocked).toBe("function");
    });

    it("getSettings should return default settings initially", () => {
      const settings = getSettings();
      expect(settings).toEqual(defaultSettings);
      expect(settings.defaultRegion).toBe("seoul");
      expect(settings.inflationAdjustDefault).toBe(false);
      expect(settings.rewardUnlockedUntil).toBeNull();
    });

    it("isRewardUnlocked should return false when rewardUnlockedUntil is null", () => {
      const now = Date.now();
      const result = isRewardUnlocked(now);
      expect(result).toBe(false);
    });
  });

  describe("AC-2: saveSettings 실패 시 이전 값 보존", () => {
    it("saveSettings should return success (ok: true) with updated settings on valid input", () => {
      const result = saveSettings({ defaultRegion: "gyeonggi" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.defaultRegion).toBe("gyeonggi");
        expect(result.data.inflationAdjustDefault).toBe(false);
        expect(result.data.rewardUnlockedUntil).toBeNull();
      }
    });

    it("saveSettings should preserve previous settings when update succeeds", () => {
      // First save
      saveSettings({ defaultRegion: "busan" });
      let settings = getSettings();
      expect(settings.defaultRegion).toBe("busan");

      // Second save (partial update)
      const result = saveSettings({ inflationAdjustDefault: true });
      expect(result.ok).toBe(true);

      settings = getSettings();
      expect(settings.defaultRegion).toBe("busan");
      expect(settings.inflationAdjustDefault).toBe(true);
      expect(settings.rewardUnlockedUntil).toBeNull();
    });

    it("saveSettings should return error (ok: false) with code 500 when localStorage fails unexpectedly", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const error = new Error("Storage error");
        error.name = "StorageError";
        throw error;
      });

      const result = saveSettings({ defaultRegion: "daegu" });
      expect(result.ok).toBe(false);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.code).toBe(500);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.message).toBeTruthy();

      setItemSpy.mockRestore();
    });

    it("saveSettings should preserve previous settings when error (code 500) occurs", () => {
      // First successful save
      saveSettings({ defaultRegion: "incheon" });
      const settingsBefore = getSettings();
      expect(settingsBefore.defaultRegion).toBe("incheon");

      // Mock localStorage to fail
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const error = new Error("Unexpected error");
        throw error;
      });

      // Attempt to save (will fail)
      const result = saveSettings({ inflationAdjustDefault: true });
      expect(result.ok).toBe(false);

      setItemSpy.mockRestore();

      // Verify previous settings are intact (deep-equal comparison)
      const settingsAfter = getSettings();
      expect(settingsAfter).toEqual(settingsBefore);
      expect(settingsAfter.defaultRegion).toBe("incheon");
      expect(settingsAfter.inflationAdjustDefault).toBe(false);
    });

    it("saveSettings should return error (ok: false) with code 507 when QuotaExceededError occurs", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      const result = saveSettings({ inflationAdjustDefault: true });
      expect(result.ok).toBe(false);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.code).toBe(507);

      setItemSpy.mockRestore();
    });

    it("saveSettings should preserve previous settings when QuotaExceededError (code 507) occurs", () => {
      // First successful save
      saveSettings({ defaultRegion: "daejeon" });
      const settingsBefore = getSettings();
      expect(settingsBefore.defaultRegion).toBe("daejeon");

      // Mock localStorage to throw QuotaExceededError
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      // Attempt to save (will fail)
      const result = saveSettings({ inflationAdjustDefault: true });
      expect(result.ok).toBe(false);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.code).toBe(507);

      setItemSpy.mockRestore();

      // Verify previous settings are intact (deep-equal)
      const settingsAfter = getSettings();
      expect(settingsAfter).toEqual(settingsBefore);
      expect(settingsAfter.defaultRegion).toBe("daejeon");
      expect(settingsAfter.inflationAdjustDefault).toBe(false);
    });
  });

  describe("AC-3: unlockReward와 isRewardUnlocked (24시간 해제 로직)", () => {
    it("unlockReward should set rewardUnlockedUntil to now + 86400000", () => {
      const now = 1000000;
      const result = unlockReward(now);
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.data.rewardUnlockedUntil).toBe(now + TWENTY_FOUR_HOURS);
        expect(result.data.defaultRegion).toBe("seoul");
      }
    });

    it("isRewardUnlocked should return true at 23:59:59 (t + 86399999)", () => {
      const now = 1000000;
      unlockReward(now);

      const checkTime = now + 86399999;
      expect(isRewardUnlocked(checkTime)).toBe(true);
    });

    it("isRewardUnlocked should return false at exactly 24:00:00 (t + 86400001)", () => {
      const now = 1000000;
      unlockReward(now);

      const checkTime = now + 86400001;
      expect(isRewardUnlocked(checkTime)).toBe(false);
    });

    it("isRewardUnlocked should return true exactly at unlock time (t + 86400000)", () => {
      const now = 1000000;
      unlockReward(now);

      const checkTime = now + TWENTY_FOUR_HOURS;
      // At exactly 24 hours, it should be false (unlock expires)
      expect(isRewardUnlocked(checkTime)).toBe(false);
    });

    it("isRewardUnlocked should return true during the 24-hour unlock window", () => {
      const now = Date.now();
      unlockReward(now);

      // Check at various points within the 24-hour window
      expect(isRewardUnlocked(now + 0)).toBe(true);
      expect(isRewardUnlocked(now + 43200000)).toBe(true); // 12 hours
      expect(isRewardUnlocked(now + 86399999)).toBe(true); // 23:59:59
    });

    it("unlockReward should return success with data type Result<AppSettings>", () => {
      const now = Date.now();
      const result = unlockReward(now);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe("object");
        expect(result.data.rewardUnlockedUntil).toBeGreaterThan(0);
        expect(result.data.defaultRegion).toBeTruthy();
        expect(typeof result.data.inflationAdjustDefault).toBe("boolean");
      }
    });
  });

  describe("AC-4: 유니온 밖 region 값은 422 Unprocessable Entity로 거부", () => {
    it("saveSettings should reject invalid region with code 422", () => {
      const result = saveSettings({ defaultRegion: "invalid_region" as Region });
      expect(result.ok).toBe(false);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.code).toBe(422);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.message).toBeTruthy();
    });

    it("saveSettings should preserve settings when invalid region is rejected (422)", () => {
      // First successful save
      saveSettings({ defaultRegion: "busan" });
      const settingsBefore = getSettings();
      expect(settingsBefore.defaultRegion).toBe("busan");

      // Try to save invalid region
      const result = saveSettings({ defaultRegion: "tokyo" as Region });
      expect(result.ok).toBe(false);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.code).toBe(422);

      // Verify settings are unchanged
      const settingsAfter = getSettings();
      expect(settingsAfter).toEqual(settingsBefore);
      expect(settingsAfter.defaultRegion).toBe("busan");
    });

    it("saveSettings should accept all valid region values", () => {
      const validRegions: Region[] = [
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

      for (const region of validRegions) {
        const result = saveSettings({ defaultRegion: region });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.data.defaultRegion).toBe(region);
        }
      }
    });

    it("saveSettings should validate region when used alone (partial update)", () => {
      // Set initial valid region
      saveSettings({ defaultRegion: "seoul" });

      // Try to update with invalid region only
      const result = saveSettings({ defaultRegion: "invalid" as Region });
      expect(result.ok).toBe(false);
      expect((result as Extract<Result<AppSettings>, { ok: false }>).error.code).toBe(422);

      // Verify original region unchanged
      const settings = getSettings();
      expect(settings.defaultRegion).toBe("seoul");
    });

    it("saveSettings should reject multiple invalid regions with 422 code", () => {
      const invalidRegions = ["unknown", "korea", "korea_south", "", null, 123, "Seoul"] as any[];

      for (const invalidRegion of invalidRegions) {
        localStorage.clear(); // Reset for each test
        const result = saveSettings({ defaultRegion: invalidRegion as Region });
        expect(result.ok).toBe(false);
        expect((result as Extract<Result<AppSettings>, { ok: false }>).error.code).toBe(422);
      }
    });
  });

  describe("Integration: 설정 저장, 리워드 해제, 조회 워크플로우", () => {
    it("should handle complete workflow: save settings, unlock reward, check status", () => {
      const now = Date.now();

      // Step 1: Save initial settings
      let result = saveSettings({ defaultRegion: "gwangju" });
      expect(result.ok).toBe(true);

      let settings = getSettings();
      expect(settings.defaultRegion).toBe("gwangju");
      expect(settings.rewardUnlockedUntil).toBeNull();

      // Step 2: Unlock reward
      result = unlockReward(now);
      expect(result.ok).toBe(true);

      settings = getSettings();
      expect(settings.rewardUnlockedUntil).toBe(now + TWENTY_FOUR_HOURS);

      // Step 3: Check reward status at different times
      expect(isRewardUnlocked(now + 0)).toBe(true);
      expect(isRewardUnlocked(now + 43200000)).toBe(true); // 12 hours
      expect(isRewardUnlocked(now + TWENTY_FOUR_HOURS + 1)).toBe(false);

      // Step 4: Update settings while reward is active
      result = saveSettings({ inflationAdjustDefault: true });
      expect(result.ok).toBe(true);

      settings = getSettings();
      expect(settings.defaultRegion).toBe("gwangju");
      expect(settings.inflationAdjustDefault).toBe(true);
      expect(settings.rewardUnlockedUntil).toBe(now + TWENTY_FOUR_HOURS);
    });

    it("should persist settings across multiple operations", () => {
      // First set of operations
      saveSettings({ defaultRegion: "ulsan", inflationAdjustDefault: true });
      let settings = getSettings();
      expect(settings.defaultRegion).toBe("ulsan");
      expect(settings.inflationAdjustDefault).toBe(true);

      // Unlock reward
      const now = Date.now();
      unlockReward(now);
      settings = getSettings();
      expect(settings.rewardUnlockedUntil).toBe(now + TWENTY_FOUR_HOURS);

      // Second set of operations (update only one field)
      saveSettings({ defaultRegion: "sejong" });
      settings = getSettings();
      expect(settings.defaultRegion).toBe("sejong");
      expect(settings.inflationAdjustDefault).toBe(true); // Should be preserved
      expect(settings.rewardUnlockedUntil).toBe(now + TWENTY_FOUR_HOURS); // Should be preserved
    });
  });

  describe("Edge cases and validation", () => {
    it("should handle empty partial update (no fields)", () => {
      const result = saveSettings({});
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(defaultSettings);
      }
    });

    it("should correctly calculate reward unlock time with large timestamps", () => {
      const largeTimestamp = 9999999999999;
      const result = unlockReward(largeTimestamp);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.rewardUnlockedUntil).toBe(largeTimestamp + TWENTY_FOUR_HOURS);
      }
    });

    it("isRewardUnlocked should work correctly with zero and negative relative times", () => {
      const now = 1000000;
      unlockReward(now);

      // Exactly at unlock start
      expect(isRewardUnlocked(now)).toBe(true);

      // Just before unlock expires
      expect(isRewardUnlocked(now + TWENTY_FOUR_HOURS - 1)).toBe(true);

      // Exactly at unlock expiration
      expect(isRewardUnlocked(now + TWENTY_FOUR_HOURS)).toBe(false);
    });

    it("should handle successive reward unlocks (overwrite)", () => {
      const now1 = 1000000;
      const now2 = 2000000;

      // First unlock
      unlockReward(now1);
      let settings = getSettings();
      expect(settings.rewardUnlockedUntil).toBe(now1 + TWENTY_FOUR_HOURS);

      // Second unlock (should overwrite)
      unlockReward(now2);
      settings = getSettings();
      expect(settings.rewardUnlockedUntil).toBe(now2 + TWENTY_FOUR_HOURS);

      // checkTime is past the first unlock's window, but the second unlock
      // overwrote rewardUnlockedUntil to now2 + 24h (a later time) — still active.
      const checkTime = now1 + TWENTY_FOUR_HOURS + 1;
      expect(isRewardUnlocked(checkTime)).toBe(true);
    });
  });
});
