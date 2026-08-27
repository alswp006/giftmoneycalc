import { describe, it, expect, beforeEach, vi } from "vitest";
import type { HistoryRecord, StorageResult } from "@/lib/types";
import type { RecordsEnvelope, RewardEnvelope } from "@/storage/keys";
import { STORAGE_KEYS } from "@/storage/keys";

// Tests are written in TDD-first style (red phase)
// These tests WILL fail until saveRecord, updateRecord, deleteRecord, listRecords,
// getReward, setRewardUnlockedNow, isOnboarded, setOnboarded are implemented

describe("packet-0005: 레코드 CRUD + 설정·리워드·온보딩 저장소", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // AC-1: saveRecord field validation (11 required fields)
  describe("AC-1: saveRecord field validation", () => {
    it("should return INVALID_RECORD with field='eventType' when eventType is undefined", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: undefined,
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("eventType");
      }
    });

    it("should return INVALID_RECORD with field='relation' when relation is null", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: null,
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("relation");
      }
    });

    it("should return INVALID_RECORD with field='amount' when amount is undefined", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: undefined,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("amount");
      }
    });

    it("should return INVALID_RECORD with field='recommendedAmount' when recommendedAmount is null", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: null,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("recommendedAmount");
      }
    });

    it("should return INVALID_RECORD with field='attended' when attended is undefined", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: undefined,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("attended");
      }
    });

    it("should return INVALID_RECORD with field='companions' when companions is null", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: null,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("companions");
      }
    });

    it("should return INVALID_RECORD with field='eventDate' when eventDate is undefined", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: undefined,
        ruleVersion: 1,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("eventDate");
      }
    });

    it("should return INVALID_RECORD with field='ruleVersion' when ruleVersion is null", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: null,
      } as any;

      const result = await saveRecord(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_RECORD");
        expect(result.field).toBe("ruleVersion");
      }
    });

    it("should save successfully when all 8 input fields are valid", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };

      const result = await saveRecord(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeDefined();
        expect(result.value.eventType).toBe("WEDDING");
        expect(result.value.relation).toBe("FAMILY");
      }
    });
  });

  // AC-2: UUID v4 + ISO 8601 timestamps on new save
  describe("AC-2: UUID v4 + ISO 8601 timestamps", () => {
    it("should generate UUID v4 matching regex pattern on new save", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };

      const result = await saveRecord(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // UUID v4 format: 8-4-4-4-12 hex digits with version/variant bits
        expect(result.value.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      }
    });

    it("should generate ISO 8601 timestamps with millisecond precision", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };

      const result = await saveRecord(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        expect(result.value.createdAt).toMatch(isoRegex);
        expect(result.value.updatedAt).toMatch(isoRegex);
      }
    });

    it("should set createdAt === updatedAt on new save", async () => {
      const { saveRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };

      const result = await saveRecord(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.createdAt).toBe(result.value.updatedAt);
      }
    });
  });

  // AC-3: updateRecord immutability + deleteRecord single removal
  describe("AC-3: updateRecord immutability + deleteRecord", () => {
    it("updateRecord should ignore id in patch and keep original id", async () => {
      const { saveRecord, updateRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };

      const saved = await saveRecord(input);
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;

      const originalId = saved.value.id;
      const patch = { amount: 60000, id: "fake-id-should-be-ignored" } as any;
      const updated = await updateRecord(originalId, patch);

      expect(updated.ok).toBe(true);
      if (updated.ok) {
        expect(updated.value.id).toBe(originalId);
        expect(updated.value.amount).toBe(60000);
      }
    });

    it("updateRecord should ignore createdAt in patch and keep original createdAt", async () => {
      const { saveRecord, updateRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };

      const saved = await saveRecord(input);
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;

      const originalCreatedAt = saved.value.createdAt;
      const patch = { amount: 60000, createdAt: "2020-01-01T00:00:00.000Z" };
      const updated = await updateRecord(saved.value.id, patch);

      expect(updated.ok).toBe(true);
      if (updated.ok) {
        expect(updated.value.createdAt).toBe(originalCreatedAt);
        expect(updated.value.amount).toBe(60000);
      }
    });

    it("updateRecord should update updatedAt when applying patch", async () => {
      const { saveRecord, updateRecord } = await import("@/storage/records");
      const input = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };

      const saved = await saveRecord(input);
      expect(saved.ok).toBe(true);
      if (!saved.ok) return;

      const originalUpdatedAt = saved.value.updatedAt;
      // Wait a tiny bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 5));

      const patch = { amount: 60000 };
      const updated = await updateRecord(saved.value.id, patch);

      expect(updated.ok).toBe(true);
      if (updated.ok) {
        expect(updated.value.updatedAt).not.toBe(originalUpdatedAt);
      }
    });

    it("deleteRecord should remove only the target record, others remain unchanged", async () => {
      const { saveRecord, deleteRecord, listRecords } = await import("@/storage/records");

      // Save 2 records
      const input1 = {
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 50000,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      };
      const input2 = {
        eventType: "FUNERAL",
        relation: "RELATIVE",
        amount: 100000,
        recommendedAmount: 100000,
        attended: true,
        companions: 2,
        eventDate: "2026-09-01",
        ruleVersion: 1,
      };

      const saved1 = await saveRecord(input1);
      const saved2 = await saveRecord(input2);
      expect(saved1.ok && saved2.ok).toBe(true);

      const beforeDelete = await listRecords();
      expect(beforeDelete.ok).toBe(true);
      if (beforeDelete.ok) {
        expect(beforeDelete.value).toHaveLength(2);
      }

      // Delete first record
      if (saved1.ok) {
        const deleteResult = await deleteRecord(saved1.value.id);
        expect(deleteResult.ok).toBe(true);
      }

      const afterDelete = await listRecords();
      expect(afterDelete.ok).toBe(true);
      if (afterDelete.ok) {
        expect(afterDelete.value).toHaveLength(1);
        if (saved2.ok) {
          expect(afterDelete.value[0].id).toBe(saved2.value.id);
        }
      }
    });
  });

  // AC-4: 500-record limit (FIFO eviction disabled)
  describe("AC-4: 500-record limit with no auto-eviction", () => {
    it("should return RECORD_LIMIT_EXCEEDED when trying to save 501st record", async () => {
      const { saveRecord, listRecords } = await import("@/storage/records");

      // Create 500 records sequentially to avoid localStorage race conditions
      for (let i = 0; i < 500; i++) {
        const result = await saveRecord({
          eventType: "WEDDING",
          relation: "FAMILY",
          amount: 50000 + i,
          recommendedAmount: 50000,
          attended: true,
          companions: 1,
          eventDate: "2026-08-28",
          ruleVersion: 1,
        });
        if (!result.ok) {
          throw new Error(`Failed to save record ${i}: ${result.code}`);
        }
      }

      // Verify we have exactly 500
      const list = await listRecords();
      expect(list.ok).toBe(true);
      if (list.ok) {
        expect(list.value).toHaveLength(500);
      }

      // Try to save 501st
      const overflow = await saveRecord({
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 99999,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      });

      expect(overflow.ok).toBe(false);
      if (!overflow.ok) {
        expect(overflow.code).toBe("RECORD_LIMIT_EXCEEDED");
      }
    });

    it("should not auto-evict records when at limit — storage state unchanged before/after overflow attempt", async () => {
      const { saveRecord, listRecords } = await import("@/storage/records");

      // Create 500 records sequentially
      for (let i = 0; i < 500; i++) {
        const result = await saveRecord({
          eventType: "WEDDING",
          relation: "FAMILY",
          amount: 50000 + i,
          recommendedAmount: 50000,
          attended: true,
          companions: 1,
          eventDate: "2026-08-28",
          ruleVersion: 1,
        });
        if (!result.ok) {
          throw new Error(`Failed to save record ${i}: ${result.code}`);
        }
      }

      // Capture state before overflow
      const beforeOverflow = await listRecords();
      expect(beforeOverflow.ok).toBe(true);
      let beforeJson = "";
      if (beforeOverflow.ok) {
        beforeJson = JSON.stringify(beforeOverflow.value);
        expect(beforeOverflow.value).toHaveLength(500);
      }

      // Try to overflow
      const overflowResult = await saveRecord({
        eventType: "WEDDING",
        relation: "FAMILY",
        amount: 99999,
        recommendedAmount: 50000,
        attended: true,
        companions: 1,
        eventDate: "2026-08-28",
        ruleVersion: 1,
      });
      expect(overflowResult.ok).toBe(false);

      // Verify state unchanged (still 500 records, not 501)
      const afterOverflow = await listRecords();
      expect(afterOverflow.ok).toBe(true);
      if (afterOverflow.ok) {
        expect(afterOverflow.value).toHaveLength(500);
        expect(JSON.stringify(afterOverflow.value)).toBe(beforeJson);
      }
    });
  });

  // AC-5: getReward + setRewardUnlockedNow + listRecords error handling
  describe("AC-5: Reward + listRecords error handling", () => {
    it("getReward should return null when lastUnlockedAt is NaN", async () => {
      const { getReward } = await import("@/storage/prefs");
      // Pre-populate with invalid lastUnlockedAt
      localStorage.setItem(
        STORAGE_KEYS.reward,
        JSON.stringify({ schemaVersion: 1, lastUnlockedAt: NaN })
      );

      const result = await getReward();
      expect(result).toBeNull();
    });

    it("getReward should return null when lastUnlockedAt is missing/undefined", async () => {
      const { getReward } = await import("@/storage/prefs");
      // Pre-populate with missing lastUnlockedAt
      localStorage.setItem(STORAGE_KEYS.reward, JSON.stringify({ schemaVersion: 1 }));

      const result = await getReward();
      expect(result).toBeNull();
    });

    it("getReward should return null when lastUnlockedAt is not a number", async () => {
      const { getReward } = await import("@/storage/prefs");
      localStorage.setItem(
        STORAGE_KEYS.reward,
        JSON.stringify({ schemaVersion: 1, lastUnlockedAt: "not-a-number" })
      );

      const result = await getReward();
      expect(result).toBeNull();
    });

    it("setRewardUnlockedNow should save Date.now() and return { ok: true }", async () => {
      const { setRewardUnlockedNow, getReward } = await import("@/storage/prefs");

      const result = await setRewardUnlockedNow();
      expect(result.ok).toBe(true);

      // Verify value was saved
      const retrieved = await getReward();
      expect(typeof retrieved).toBe("number");
      expect(retrieved).toBeGreaterThan(0);
    });

    it("listRecords should return empty array on corrupted storage", async () => {
      const { listRecords } = await import("@/storage/records");
      // Pre-populate with invalid JSON
      localStorage.setItem(STORAGE_KEYS.records, "corrupted{[}");

      const result = await listRecords();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value).toHaveLength(0);
      }
    });

    it("listRecords should not throw on missing storage — return empty array", async () => {
      const { listRecords } = await import("@/storage/records");
      localStorage.clear();

      const result = await listRecords();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  // Onboarding state tests
  describe("Onboarding state", () => {
    it("isOnboarded should return false when not set", async () => {
      const { isOnboarded } = await import("@/storage/prefs");
      localStorage.clear();

      const result = await isOnboarded();
      expect(result).toBe(false);
    });

    it("setOnboarded should mark as onboarded and isOnboarded returns true", async () => {
      const { setOnboarded, isOnboarded } = await import("@/storage/prefs");
      localStorage.clear();

      await setOnboarded();
      const result = await isOnboarded();
      expect(result).toBe(true);
    });
  });
});
