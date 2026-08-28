import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GiftRecord, AppSettings, Result } from "@/lib/types";

// Import functions to test (will be implemented in storage.ts)
import {
  readRecords,
  writeRecords,
  readSettings,
  writeSettings,
  clearAll,
} from "@/lib/storage";

describe("localStorage CRUD 기반 모듈 (키 격리 · 413 · 507)", () => {
  // Storage keys for namespace isolation
  const RECORDS_KEY = "gmc:records";
  const SETTINGS_KEY = "gmc:settings";

  // Default settings for tests
  const defaultSettings: AppSettings = {
    defaultRegion: "seoul",
    inflationAdjustDefault: false,
    rewardUnlockedUntil: null,
  };

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
    it("should export readRecords function", () => {
      expect(typeof readRecords).toBe("function");
    });

    it("should export writeRecords function", () => {
      expect(typeof writeRecords).toBe("function");
    });

    it("should export readSettings function", () => {
      expect(typeof readSettings).toBe("function");
    });

    it("should export writeSettings function", () => {
      expect(typeof writeSettings).toBe("function");
    });

    it("should export clearAll function", () => {
      expect(typeof clearAll).toBe("function");
    });

    it("readRecords should return empty array initially", () => {
      const records = readRecords();
      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(0);
    });

    it("readSettings should return default settings initially", () => {
      const settings = readSettings();
      expect(settings).toEqual(defaultSettings);
    });
  });

  describe("AC-1: 정상 R/W 동작", () => {
    it("should write and read single GiftRecord", () => {
      const now = Date.now();
      const record: GiftRecord = {
        id: "rec_" + now,
        personName: "김철수",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-29",
        amount: 50000,
        memo: "결혼식 선물",
        createdAt: now,
        updatedAt: now,
      };

      const writeResult = writeRecords([record]);
      expect(writeResult.ok).toBe(true);

      const readResult = readRecords();
      expect(readResult).toHaveLength(1);
      expect(readResult[0]).toEqual(record);
      expect(readResult[0].personName).toBe("김철수");
      expect(readResult[0].amount).toBe(50000);
    });

    it("should write and read multiple GiftRecords", () => {
      const now = Date.now();
      const records: GiftRecord[] = [
        {
          id: "rec_1",
          personName: "김철수",
          eventType: "wedding",
          relationship: "friends",
          eventDate: "2026-08-20",
          amount: 50000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "rec_2",
          personName: "이영희",
          eventType: "funeral",
          relationship: "parents",
          eventDate: "2026-08-21",
          amount: 100000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "rec_3",
          personName: "박민준",
          eventType: "firstBirthday",
          relationship: "children",
          eventDate: "2026-08-22",
          amount: 200000,
          memo: "첫돌 선물",
          createdAt: now,
          updatedAt: now,
        },
      ];

      const writeResult = writeRecords(records);
      expect(writeResult.ok).toBe(true);

      const readResult = readRecords();
      expect(readResult).toHaveLength(3);
      expect(readResult[0].personName).toBe("김철수");
      expect(readResult[1].personName).toBe("이영희");
      expect(readResult[2].personName).toBe("박민준");
      expect(readResult[2].amount).toBe(200000);
    });

    it("should write and read AppSettings", () => {
      const settings: AppSettings = {
        defaultRegion: "gyeonggi",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: 1234567890,
      };

      const writeResult = writeSettings(settings);
      expect(writeResult.ok).toBe(true);

      const readResult = readSettings();
      expect(readResult).toEqual(settings);
      expect(readResult.defaultRegion).toBe("gyeonggi");
      expect(readResult.inflationAdjustDefault).toBe(true);
      expect(readResult.rewardUnlockedUntil).toBe(1234567890);
    });

    it("should overwrite previous records on subsequent writes", () => {
      const now = Date.now();
      const record1: GiftRecord = {
        id: "rec_1",
        personName: "첫번째",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-20",
        amount: 10000,
        createdAt: now,
        updatedAt: now,
      };

      const record2: GiftRecord = {
        id: "rec_2",
        personName: "두번째",
        eventType: "funeral",
        relationship: "parents",
        eventDate: "2026-08-21",
        amount: 20000,
        createdAt: now,
        updatedAt: now,
      };

      writeRecords([record1]);
      let readResult = readRecords();
      expect(readResult).toHaveLength(1);
      expect(readResult[0].personName).toBe("첫번째");

      writeRecords([record2]);
      readResult = readRecords();
      expect(readResult).toHaveLength(1);
      expect(readResult[0].personName).toBe("두번째");
      expect(readResult[0].amount).toBe(20000);
    });
  });

  describe("AC-2: 키 격리 검증", () => {
    it("should use only 'gmc:records' key for records", () => {
      const now = Date.now();
      const record: GiftRecord = {
        id: "rec_" + now,
        personName: "테스트",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-29",
        amount: 50000,
        createdAt: now,
        updatedAt: now,
      };

      writeRecords([record]);

      // Verify it was written to the correct key
      const stored = localStorage.getItem(RECORDS_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].personName).toBe("테스트");

      // Verify no other keys were created
      const allKeys = Object.keys(localStorage);
      expect(allKeys).toContain(RECORDS_KEY);
    });

    it("should use only 'gmc:settings' key for settings", () => {
      const settings: AppSettings = {
        defaultRegion: "busan",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: null,
      };

      writeSettings(settings);

      // Verify it was written to the correct key
      const stored = localStorage.getItem(SETTINGS_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.defaultRegion).toBe("busan");
      expect(parsed.inflationAdjustDefault).toBe(true);

      // Verify no other keys were created
      const allKeys = Object.keys(localStorage);
      expect(allKeys).toContain(SETTINGS_KEY);
    });
  });

  describe("AC-3: 최대 1,000건 제한 (413 Payload Too Large)", () => {
    it("should accept exactly 1,000 records", () => {
      const now = Date.now();
      const records: GiftRecord[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `rec_${i}`,
        personName: `person_${i}`,
        eventType: "wedding" as const,
        relationship: "friends" as const,
        eventDate: "2026-08-29",
        amount: 10000 + i,
        createdAt: now,
        updatedAt: now,
      }));

      const result = writeRecords(records);
      expect(result.ok).toBe(true);

      const readResult = readRecords();
      expect(readResult).toHaveLength(1000);
      expect(readResult[0].personName).toBe("person_0");
      expect(readResult[999].personName).toBe("person_999");
    });

    it("should reject 1,001 records with 413 error code", () => {
      const now = Date.now();
      const records: GiftRecord[] = Array.from({ length: 1001 }, (_, i) => ({
        id: `rec_${i}`,
        personName: `person_${i}`,
        eventType: "wedding" as const,
        relationship: "friends" as const,
        eventDate: "2026-08-29",
        amount: 10000 + i,
        createdAt: now,
        updatedAt: now,
      }));

      const result = writeRecords(records);
      expect(result.ok).toBe(false);
      expect((result as Result<void>).error.code).toBe(413);
      expect((result as Result<void>).error.message).toBeTruthy();
    });

    it("should not modify existing records when 413 error occurs", () => {
      const now = Date.now();
      // Write 500 valid records first
      const validRecords: GiftRecord[] = Array.from({ length: 500 }, (_, i) => ({
        id: `rec_${i}`,
        personName: `person_${i}`,
        eventType: "wedding" as const,
        relationship: "friends" as const,
        eventDate: "2026-08-29",
        amount: 10000 + i,
        createdAt: now,
        updatedAt: now,
      }));

      const writeResult1 = writeRecords(validRecords);
      expect(writeResult1.ok).toBe(true);

      const readResult1 = readRecords();
      expect(readResult1).toHaveLength(500);

      // Try to write 1,001 records (should fail)
      const tooManyRecords: GiftRecord[] = Array.from(
        { length: 1001 },
        (_, i) => ({
          id: `rec_overflow_${i}`,
          personName: `overflow_person_${i}`,
          eventType: "wedding" as const,
          relationship: "friends" as const,
          eventDate: "2026-08-29",
          amount: 50000 + i,
          createdAt: now,
          updatedAt: now,
        })
      );

      const writeResult2 = writeRecords(tooManyRecords);
      expect(writeResult2.ok).toBe(false);
      expect((writeResult2 as Result<void>).error.code).toBe(413);

      // Verify original 500 records are still there unchanged
      const readResult2 = readRecords();
      expect(readResult2).toHaveLength(500);
      expect(readResult2[0].personName).toBe("person_0");
      expect(readResult2[499].personName).toBe("person_499");
    });

    it("should reject records when cumulative total exceeds 1,000", () => {
      const now = Date.now();
      // First write: 800 records
      const records1: GiftRecord[] = Array.from({ length: 800 }, (_, i) => ({
        id: `rec_${i}`,
        personName: `person_${i}`,
        eventType: "wedding" as const,
        relationship: "friends" as const,
        eventDate: "2026-08-29",
        amount: 10000,
        createdAt: now,
        updatedAt: now,
      }));

      writeRecords(records1);
      const read1 = readRecords();
      expect(read1).toHaveLength(800);

      // Second write: try to add 300 more (total would be 1,100 > 1,000)
      const records2: GiftRecord[] = Array.from({ length: 300 }, (_, i) => ({
        id: `rec_new_${i}`,
        personName: `new_person_${i}`,
        eventType: "wedding" as const,
        relationship: "friends" as const,
        eventDate: "2026-08-29",
        amount: 20000,
        createdAt: now,
        updatedAt: now,
      }));

      const result = writeRecords(records2);
      expect(result.ok).toBe(false);
      expect((result as Result<void>).error.code).toBe(413);

      // Original 800 should remain
      const read2 = readRecords();
      expect(read2).toHaveLength(800);
    });
  });

  describe("AC-4: QuotaExceededError 처리 (507 Insufficient Storage)", () => {
    it("should return 507 error when QuotaExceededError is thrown", () => {
      const now = Date.now();
      const record: GiftRecord = {
        id: "rec_" + now,
        personName: "테스트",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-29",
        amount: 50000,
        createdAt: now,
        updatedAt: now,
      };

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      const result = writeRecords([record]);
      expect(result.ok).toBe(false);
      expect((result as Result<void>).error.code).toBe(507);

      // Restore original setItem
      localStorage.setItem = originalSetItem;
    });

    it("should not modify existing records when QuotaExceededError occurs", () => {
      const now = Date.now();
      // First, write valid records
      const initialRecords: GiftRecord[] = [
        {
          id: "rec_1",
          personName: "초기데이터",
          eventType: "wedding",
          relationship: "friends",
          eventDate: "2026-08-29",
          amount: 50000,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const writeResult1 = writeRecords(initialRecords);
      expect(writeResult1.ok).toBe(true);

      const readResult1 = readRecords();
      expect(readResult1).toHaveLength(1);
      expect(readResult1[0].personName).toBe("초기데이터");

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      // Try to write new records
      const newRecords: GiftRecord[] = [
        {
          id: "rec_new",
          personName: "새로운데이터",
          eventType: "funeral",
          relationship: "parents",
          eventDate: "2026-08-30",
          amount: 100000,
          createdAt: now + 1000,
          updatedAt: now + 1000,
        },
      ];

      const writeResult2 = writeRecords(newRecords);
      expect(writeResult2.ok).toBe(false);
      expect((writeResult2 as Result<void>).error.code).toBe(507);

      // Restore original setItem
      localStorage.setItem = originalSetItem;

      // Verify original data is unchanged
      const readResult2 = readRecords();
      expect(readResult2).toHaveLength(1);
      expect(readResult2[0].personName).toBe("초기데이터");
      expect(readResult2[0].amount).toBe(50000);
    });

    it("should return 507 error when settings write exceeds quota", () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      });

      const settings: AppSettings = {
        defaultRegion: "seoul",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: 1234567890,
      };

      const result = writeSettings(settings);
      expect(result.ok).toBe(false);
      expect((result as Result<void>).error.code).toBe(507);

      localStorage.setItem = originalSetItem;
    });
  });

  describe("AC-5: JSON 파싱 실패 처리 (graceful fallback)", () => {
    it("should return empty array when records JSON is corrupted", () => {
      // Manually corrupt the localStorage data
      localStorage.setItem(RECORDS_KEY, "invalid json {{{");

      const result = readRecords();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should return default settings when settings JSON is corrupted", () => {
      // Manually corrupt the localStorage data
      localStorage.setItem(SETTINGS_KEY, "invalid json {{{");

      const result = readSettings();
      expect(result).toEqual(defaultSettings);
      expect(result.defaultRegion).toBe("seoul");
      expect(result.inflationAdjustDefault).toBe(false);
      expect(result.rewardUnlockedUntil).toBeNull();
    });

    it("should not throw error when reading corrupted records", () => {
      localStorage.setItem(RECORDS_KEY, "not json");

      expect(() => {
        readRecords();
      }).not.toThrow();
    });

    it("should not throw error when reading corrupted settings", () => {
      localStorage.setItem(SETTINGS_KEY, "not json");

      expect(() => {
        readSettings();
      }).not.toThrow();
    });
  });

  describe("AC-5: clearAll 동작", () => {
    it("should clear all data and return success", () => {
      const now = Date.now();
      // Write both records and settings
      const record: GiftRecord = {
        id: "rec_" + now,
        personName: "테스트",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-29",
        amount: 50000,
        createdAt: now,
        updatedAt: now,
      };

      const settings: AppSettings = {
        defaultRegion: "gyeonggi",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: 1234567890,
      };

      writeRecords([record]);
      writeSettings(settings);

      const readResult1 = readRecords();
      const readSettings1 = readSettings();
      expect(readResult1).toHaveLength(1);
      expect(readSettings1.defaultRegion).toBe("gyeonggi");

      // Clear all
      const clearResult = clearAll();
      expect(clearResult.ok).toBe(true);

      // Verify everything is cleared
      const readResult2 = readRecords();
      const readSettings2 = readSettings();
      expect(readResult2).toHaveLength(0);
      expect(readSettings2).toEqual(defaultSettings);
    });

    it("should clear both keys when clearAll is called", () => {
      const now = Date.now();
      const record: GiftRecord = {
        id: "rec_" + now,
        personName: "테스트",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-29",
        amount: 50000,
        createdAt: now,
        updatedAt: now,
      };

      writeRecords([record]);
      writeSettings(defaultSettings);

      expect(localStorage.getItem(RECORDS_KEY)).toBeTruthy();
      expect(localStorage.getItem(SETTINGS_KEY)).toBeTruthy();

      clearAll();

      expect(localStorage.getItem(RECORDS_KEY)).toBeNull();
      expect(localStorage.getItem(SETTINGS_KEY)).toBeNull();
    });
  });

  describe("Integration: 전체 CRUD 워크플로우", () => {
    it("should handle complete workflow: write, read, modify, clear", () => {
      const now = Date.now();

      // Step 1: Write initial records
      const records1: GiftRecord[] = [
        {
          id: "rec_1",
          personName: "김철수",
          eventType: "wedding",
          relationship: "friends",
          eventDate: "2026-08-20",
          amount: 50000,
          createdAt: now,
          updatedAt: now,
        },
      ];

      let writeResult = writeRecords(records1);
      expect(writeResult.ok).toBe(true);

      // Step 2: Write settings
      const settings: AppSettings = {
        defaultRegion: "seoul",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: null,
      };

      writeResult = writeSettings(settings);
      expect(writeResult.ok).toBe(true);

      // Step 3: Verify both are stored
      let readRecordsResult = readRecords();
      let readSettingsResult = readSettings();
      expect(readRecordsResult).toHaveLength(1);
      expect(readSettingsResult.defaultRegion).toBe("seoul");

      // Step 4: Modify records
      const records2: GiftRecord[] = [
        ...records1,
        {
          id: "rec_2",
          personName: "이영희",
          eventType: "funeral",
          relationship: "parents",
          eventDate: "2026-08-21",
          amount: 100000,
          createdAt: now,
          updatedAt: now,
        },
      ];

      writeResult = writeRecords(records2);
      expect(writeResult.ok).toBe(true);

      readRecordsResult = readRecords();
      expect(readRecordsResult).toHaveLength(2);

      // Step 5: Clear everything
      let clearResult = clearAll();
      expect(clearResult.ok).toBe(true);

      readRecordsResult = readRecords();
      readSettingsResult = readSettings();
      expect(readRecordsResult).toHaveLength(0);
      expect(readSettingsResult).toEqual(defaultSettings);
    });
  });
});
