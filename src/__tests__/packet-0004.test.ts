import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { GiftRecord, Result } from "@/lib/types";
import {
  createRecord,
  updateRecord,
  deleteRecord,
  subscribeRecords,
} from "@/lib/records";
import { readRecords, writeRecords } from "@/lib/storage";

describe("레코드 도메인 연산 (409 중복·낙관적 잠금 · 404 · subscribeRecords)", () => {
  const RECORDS_KEY = "gmc:records";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ─ AC-1: ID는 crypto.randomUUID()로 만들고 기존 ID와 충돌 시 최대 3회 재생성 ─
  describe("AC-1: createRecord - ID 생성 및 충돌 처리", () => {
    it("should create record with unique UUID and return success", () => {
      const now = Date.now();
      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };

      const result = createRecord(input);
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.data.id).toBeTruthy();
        expect(result.data.personName).toBe("김철수");
        expect(result.data.eventType).toBe("wedding");
        expect(result.data.eventDate).toBe("2026-08-29");
        expect(result.data.amount).toBe(50000);
        expect(result.data.createdAt).toBeGreaterThan(0);
        expect(result.data.updatedAt).toEqual(result.data.createdAt);
      }
    });

    it("should retry on UUID collision (up to 3 times) and succeed", () => {
      const now = Date.now();

      // Seed first record
      const firstRecord: GiftRecord = {
        id: "uuid-1",
        personName: "first",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-20",
        amount: 10000,
        createdAt: now,
        updatedAt: now,
      };
      writeRecords([firstRecord]);

      // Mock crypto.randomUUID to simulate 2 collisions, then success
      const uuids = ["uuid-1", "uuid-1", "uuid-new"];
      let callCount = 0;
      vi.stubGlobal(
        "crypto",
        {
          randomUUID: () => {
            const result = uuids[callCount];
            callCount++;
            return result;
          },
        },
      );

      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };

      const result = createRecord(input);
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(result.data.id).toBe("uuid-new");
        expect(result.data.personName).toBe("김철수");
      }
    });

    it("should return 409 after 3 failed UUID collision retries", () => {
      const now = Date.now();

      // Seed first record
      const firstRecord: GiftRecord = {
        id: "uuid-1",
        personName: "first",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-20",
        amount: 10000,
        createdAt: now,
        updatedAt: now,
      };
      writeRecords([firstRecord]);

      // Mock crypto.randomUUID to always return the same (collision) ID
      vi.stubGlobal(
        "crypto",
        {
          randomUUID: () => "uuid-1",
        },
      );

      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };

      const result = createRecord(input);
      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.code).toBe(409);
        expect(result.error.message).toBeTruthy();
      }
    });
  });

  // ─ AC-2: personName|eventDate|eventType 중복 감지 (force로 우회 가능) ─
  describe("AC-2: createRecord - 중복 감지 (personName|eventDate|eventType)", () => {
    it("should detect duplicate and return 409 without force flag", () => {
      const now = Date.now();

      // Create first record
      const firstInput = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      const result1 = createRecord(firstInput);
      expect(result1.ok).toBe(true);

      // Try to create duplicate (same personName, eventDate, eventType)
      const duplicateInput = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 60000, // different amount, but still duplicate
      };

      const result2 = createRecord(duplicateInput);
      expect(result2.ok).toBe(false);

      if (!result2.ok) {
        expect(result2.error.code).toBe(409);
        expect(result2.error.message).toBeTruthy();
      }
    });

    it("should allow duplicate when force:true is passed", () => {
      const now = Date.now();

      // Create first record
      const firstInput = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      const result1 = createRecord(firstInput);
      expect(result1.ok).toBe(true);

      // Try to create duplicate with force:true
      const duplicateInput = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 60000,
      };

      const result2 = createRecord(duplicateInput, { force: true });
      expect(result2.ok).toBe(true);

      if (result2.ok) {
        expect(result2.data.personName).toBe("김철수");
        expect(result2.data.amount).toBe(60000);
      }

      // Verify both records exist
      const stored = readRecords();
      expect(stored.length).toBe(2);
      const amounts = stored.map((r) => r.amount).sort();
      expect(amounts).toEqual([50000, 60000]);
    });

    it("should allow different combinations even with same person name", () => {
      const now = Date.now();

      // Create first record
      const input1 = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      const result1 = createRecord(input1);
      expect(result1.ok).toBe(true);

      // Create second with same personName but different eventDate
      const input2 = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-30", // different date
        amount: 50000,
      };

      const result2 = createRecord(input2);
      expect(result2.ok).toBe(true);

      if (result2.ok) {
        expect(result2.data.eventDate).toBe("2026-08-30");
      }

      // Verify both exist
      const stored = readRecords();
      expect(stored.length).toBe(2);
    });
  });

  // ─ AC-3: updateRecord의 baseUpdatedAt 낙관적 잠금 ─
  describe("AC-3: updateRecord - 낙관적 잠금 (baseUpdatedAt)", () => {
    it("should update record when baseUpdatedAt matches", () => {
      const now = Date.now();

      // Create initial record
      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      const createResult = createRecord(input);
      expect(createResult.ok).toBe(true);

      if (!createResult.ok) return;
      const recordId = createResult.data.id;
      const baseUpdatedAt = createResult.data.updatedAt;

      // Update with correct baseUpdatedAt
      const patch = { amount: 60000 };
      const updateResult = updateRecord(recordId, patch, baseUpdatedAt);

      expect(updateResult.ok).toBe(true);

      if (updateResult.ok) {
        expect(updateResult.data.id).toBe(recordId);
        expect(updateResult.data.amount).toBe(60000);
        expect(updateResult.data.updatedAt).toBeGreaterThan(baseUpdatedAt);
      }
    });

    it("should return 409 when baseUpdatedAt mismatches", () => {
      const now = Date.now();

      // Create initial record
      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      const createResult = createRecord(input);
      expect(createResult.ok).toBe(true);

      if (!createResult.ok) return;
      const recordId = createResult.data.id;
      const baseUpdatedAt = createResult.data.updatedAt;

      // First update to change updatedAt
      const patch1 = { amount: 60000 };
      updateRecord(recordId, patch1, baseUpdatedAt);

      // Try second update with old baseUpdatedAt (should fail)
      const patch2 = { amount: 70000 };
      const result = updateRecord(recordId, patch2, baseUpdatedAt); // old timestamp

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.code).toBe(409);
      }

      // Verify data is unchanged (still 60000, not 70000)
      const stored = readRecords();
      const record = stored.find((r) => r.id === recordId);
      expect(record?.amount).toBe(60000);
    });

    it("should return 404 when updating non-existent record", () => {
      const fakeId = "non-existent-id-12345";
      const baseUpdatedAt = Date.now();

      const result = updateRecord(fakeId, { amount: 50000 }, baseUpdatedAt);

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.code).toBe(404);
      }
    });
  });

  // ─ AC-4: deleteRecord ─
  describe("AC-4: deleteRecord", () => {
    it("should delete existing record and return success", () => {
      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      const createResult = createRecord(input);
      expect(createResult.ok).toBe(true);

      if (!createResult.ok) return;
      const recordId = createResult.data.id;

      // Verify record exists
      let stored = readRecords();
      expect(stored.length).toBe(1);
      expect(stored[0].id).toBe(recordId);

      // Delete record
      const deleteResult = deleteRecord(recordId);
      expect(deleteResult.ok).toBe(true);

      // Verify record is gone
      stored = readRecords();
      expect(stored.length).toBe(0);
    });

    it("should return 404 when deleting non-existent record", () => {
      const fakeId = "non-existent-id-12345";

      const result = deleteRecord(fakeId);

      expect(result.ok).toBe(false);

      if (!result.ok) {
        expect(result.error.code).toBe(404);
      }
    });
  });

  // ─ AC-5: subscribeRecords ─
  describe("AC-5: subscribeRecords - 구독 및 unsubscribe", () => {
    it("should call callback on same-tab createRecord", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeRecords(callback);

      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      const result = createRecord(input);
      expect(result.ok).toBe(true);

      // Callback should be called once
      expect(callback).toHaveBeenCalledTimes(1);

      if (result.ok) {
        const records = callback.mock.calls[0][0];
        expect(Array.isArray(records)).toBe(true);
        expect(records.length).toBe(1);
        expect(records[0].personName).toBe("김철수");
      }

      unsubscribe();
    });

    it("should call callback on storage event (different tab)", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeRecords(callback);

      const now = Date.now();
      const newRecord: GiftRecord = {
        id: "rec_from_other_tab",
        personName: "이영희",
        eventType: "funeral",
        relationship: "parents",
        eventDate: "2026-08-30",
        amount: 100000,
        createdAt: now,
        updatedAt: now,
      };

      // Simulate storage event from different tab
      const storageEvent = new StorageEvent("storage", {
        key: "gmc:records",
        newValue: JSON.stringify([newRecord]),
        oldValue: null,
        storageArea: localStorage,
      });

      window.dispatchEvent(storageEvent);

      // Callback should be called
      expect(callback).toHaveBeenCalledTimes(1);

      if (callback.mock.calls[0]) {
        const records = callback.mock.calls[0][0];
        expect(Array.isArray(records)).toBe(true);
        expect(records.length).toBe(1);
        expect(records[0].personName).toBe("이영희");
      }

      unsubscribe();
    });

    it("should not call callback after unsubscribe", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeRecords(callback);

      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      createRecord(input);
      expect(callback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Create another record
      const input2 = {
        personName: "이영희",
        eventType: "funeral" as const,
        eventDate: "2026-08-30",
        amount: 100000,
      };
      createRecord(input2);

      // Callback should still be 1 (no additional calls)
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple subscribers independently", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscribeRecords(callback1);
      const unsubscribe2 = subscribeRecords(callback2);

      const input = {
        personName: "김철수",
        eventType: "wedding" as const,
        eventDate: "2026-08-29",
        amount: 50000,
      };
      createRecord(input);

      // Both should be called
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      // Unsubscribe first one
      unsubscribe1();

      const input2 = {
        personName: "이영희",
        eventType: "funeral" as const,
        eventDate: "2026-08-30",
        amount: 100000,
      };
      createRecord(input2);

      // Only callback2 should be called again
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(2);

      unsubscribe2();
    });
  });
});
