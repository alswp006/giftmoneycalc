import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  GiftRecord,
  Settings,
  LastCalc,
  RewardUnlock,
  WriteResult,
  CalcInput,
  CalcResult,
} from "@/lib/types";

// These will be imported from src/lib/storage.ts (not yet created)
// We write tests for the expected API
let storage: any;

beforeEach(async () => {
  localStorage.clear();
  // Import will fail until storage.ts is created — that's expected
  try {
    storage = await import("@/lib/storage");
  } catch {
    // Storage not yet created
  }
});

afterEach(() => {
  localStorage.clear();
});

describe("AC-1: Storage module exports", () => {
  it("should export all required functions", async () => {
    const mod = await import("@/lib/storage");
    expect(typeof mod.getRecords).toBe("function");
    expect(typeof mod.addRecord).toBe("function");
    expect(typeof mod.deleteRecord).toBe("function");
    expect(typeof mod.getSettings).toBe("function");
    expect(typeof mod.saveSettings).toBe("function");
    expect(typeof mod.getLastCalc).toBe("function");
    expect(typeof mod.saveLastCalc).toBe("function");
    expect(typeof mod.getRewardUnlock).toBe("function");
    expect(typeof mod.saveRewardUnlock).toBe("function");
    expect(typeof mod.clearAllData).toBe("function");
  });
});

describe("AC-2: addRecord success — UUID, timestamp, and length", () => {
  it("should add a record with 36-char UUID and epoch timestamp", async () => {
    const { addRecord, getRecords } = await import("@/lib/storage");
    const initialLen = getRecords().length;

    const record: Partial<GiftRecord> = {
      personName: "Kim Sung",
      eventType: "wedding",
      relation: "closeFriend",
      amount: 50000,
      date: "2026-08-27",
      direction: "given",
      memo: "Gift for wedding",
    };

    const result = addRecord(
      record.personName!,
      record.eventType!,
      record.relation!,
      record.amount!,
      record.date!,
      record.direction!,
      record.memo!
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected addRecord to succeed");
    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(result.id.length).toBe(36);

    const records = getRecords();
    expect(records.length).toBe(initialLen + 1);

    const added = records[records.length - 1];
    expect(added.id).toBe(result.id);
    expect(typeof added.createdAt).toBe("number");
    expect(added.createdAt).toBeGreaterThan(0);
    expect(added.createdAt).toBeLessThanOrEqual(Date.now());
    expect(Number.isInteger(added.createdAt)).toBe(true);
  });

  it("should store record with correct field values", async () => {
    const { addRecord, getRecords } = await import("@/lib/storage");

    addRecord("Alice", "funeral", "family", 100000, "2026-08-20", "received", "Funeral gift");

    const records = getRecords();
    const record = records[0];

    expect(record.personName).toBe("Alice");
    expect(record.eventType).toBe("funeral");
    expect(record.relation).toBe("family");
    expect(record.amount).toBe(100000);
    expect(record.date).toBe("2026-08-20");
    expect(record.direction).toBe("received");
    expect(record.memo).toBe("Funeral gift");
  });
});

describe("AC-3: Malformed JSON recovery", () => {
  it("should return [] and repair storage on parse error", async () => {
    const { getRecords } = await import("@/lib/storage");

    // Corrupt the records key with invalid JSON
    localStorage.setItem("gmc:records:v1", "{{{not-json");

    const records = getRecords();
    expect(records).toEqual([]);

    // Verify that storage was repaired to valid JSON
    const stored = localStorage.getItem("gmc:records:v1");
    expect(stored).toBe("[]");
  });

  it("should not call console.error on malformed JSON", async () => {
    const { getRecords } = await import("@/lib/storage");
    const errorSpy = vi.spyOn(console, "error");

    localStorage.setItem("gmc:records:v1", "{{invalid");
    getRecords();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("should repair settings on parse error", async () => {
    const { getSettings, saveSettings } = await import("@/lib/storage");

    localStorage.setItem("gmc:settings:v1", "{broken");

    const settings = getSettings();
    // Should return default settings
    expect(settings).toHaveProperty("onboardingDone");
    expect(typeof settings.onboardingDone).toBe("boolean");

    // Verify storage was repaired
    const stored = localStorage.getItem("gmc:settings:v1");
    expect(stored).toBeTruthy();
    JSON.parse(stored!); // Should not throw
  });
});

describe("AC-4: QuotaExceededError handling", () => {
  it("should return QUOTA_EXCEEDED when localStorage is full", async () => {
    const { addRecord } = await import("@/lib/storage");

    // Mock localStorage.setItem to throw QuotaExceededError
    const originalSetItem = Storage.prototype.setItem;
    let callCount = 0;

    Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      callCount++;
      if (callCount > 1) {
        // First call (for initial getRecords) succeeds, second call (addRecord) fails
        const error = new Error("QuotaExceededError");
        error.name = "QuotaExceededError";
        throw error;
      }
      originalSetItem.call(localStorage, key, value);
    });

    const result = addRecord(
      "Test",
      "wedding",
      "friend",
      30000,
      "2026-08-27",
      "given",
      "memo"
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected addRecord to fail");
    expect(result.reason).toBe("QUOTA_EXCEEDED");

    Storage.prototype.setItem = originalSetItem;
  });

  it("should not throw exception on quota exceeded", async () => {
    const { addRecord } = await import("@/lib/storage");

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      const error = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      throw error;
    });

    expect(() => {
      addRecord("Test", "wedding", "friend", 30000, "2026-08-27", "given", "");
    }).not.toThrow();

    Storage.prototype.setItem = originalSetItem;
  });
});

describe("AC-5: 1000-record limit and clearAllData", () => {
  it("should return LIMIT_REACHED when at 1000 records", async () => {
    const { addRecord, getRecords } = await import("@/lib/storage");

    // Pre-populate storage with 1000 records
    const records: GiftRecord[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      personName: `Person${i}`,
      eventType: "wedding" as const,
      relation: "friend" as const,
      amount: 10000,
      date: "2026-08-27",
      direction: "given" as const,
      memo: "memo",
      createdAt: Date.now(),
    }));

    localStorage.setItem("gmc:records:v1", JSON.stringify(records));

    const result = addRecord(
      "NewPerson",
      "wedding",
      "friend",
      10000,
      "2026-08-27",
      "given",
      ""
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected addRecord to fail");
    expect(result.reason).toBe("LIMIT_REACHED");

    // Verify count is still 1000
    const stored = getRecords();
    expect(stored.length).toBe(1000);
  });

  it("should clear records and lastCalc but preserve settings", async () => {
    const { addRecord, saveSettings, saveLastCalc, clearAllData, getRecords, getSettings, getLastCalc } =
      await import("@/lib/storage");

    // Set up data
    addRecord("Alice", "wedding", "friend", 30000, "2026-08-27", "given", "memo");
    const settings: Settings = {
      defaultRegion: "metropolitan",
      onboardingDone: true,
      compactList: true,
    };
    saveSettings(settings);

    const calcInput: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      attendance: "attending",
      region: "metropolitan",
    };
    const calcResult: CalcResult = {
      recommended: 30000,
      min: 20000,
      max: 50000,
      rawAmount: 25000,
      breakdown: [],
      input: calcInput,
    };
    const lastCalc: LastCalc = {
      input: calcInput,
      result: calcResult,
      at: Date.now(),
    };
    saveLastCalc(lastCalc);

    // Clear all
    clearAllData();

    // Verify records are cleared
    expect(getRecords()).toEqual([]);

    // Verify lastCalc is cleared
    expect(getLastCalc()).toBeNull();

    // Verify settings are preserved
    const preservedSettings = getSettings();
    expect(preservedSettings.defaultRegion).toBe("metropolitan");
    expect(preservedSettings.onboardingDone).toBe(true);
    expect(preservedSettings.compactList).toBe(true);
  });

  it("should clear rewardUnlock on clearAllData", async () => {
    const { saveRewardUnlock, clearAllData, getRewardUnlock } = await import("@/lib/storage");

    saveRewardUnlock({ statsUnlockedUntil: Date.now() + 86400000 });

    clearAllData();

    const unlock = getRewardUnlock();
    expect(unlock).toEqual({ statsUnlockedUntil: 0 });
  });
});

describe("Additional edge cases", () => {
  it("should handle deleteRecord", async () => {
    const { addRecord, getRecords, deleteRecord } = await import("@/lib/storage");

    const r1 = addRecord("Alice", "wedding", "friend", 30000, "2026-08-27", "given", "");
    const r2 = addRecord("Bob", "funeral", "family", 50000, "2026-08-20", "received", "");

    expect(getRecords().length).toBe(2);
    if (!r1.ok) throw new Error("expected addRecord to succeed");

    deleteRecord(r1.id);

    const remaining = getRecords();
    expect(remaining.length).toBe(1);
    expect(remaining[0].personName).toBe("Bob");
  });

  it("should roundtrip Settings correctly", async () => {
    const { getSettings, saveSettings } = await import("@/lib/storage");

    const settings: Settings = {
      defaultRegion: "seoulGangnam",
      onboardingDone: true,
      compactList: false,
    };

    saveSettings(settings);

    const loaded = getSettings();
    expect(loaded.defaultRegion).toBe("seoulGangnam");
    expect(loaded.onboardingDone).toBe(true);
    expect(loaded.compactList).toBe(false);
  });

  it("should return default settings when key is missing", async () => {
    const { getSettings } = await import("@/lib/storage");

    localStorage.removeItem("gmc:settings:v1");

    const settings = getSettings();
    expect(settings).toHaveProperty("onboardingDone");
    expect(settings).toHaveProperty("defaultRegion");
    expect(settings).toHaveProperty("compactList");
  });

  it("should return null for lastCalc when key is missing", async () => {
    const { getLastCalc } = await import("@/lib/storage");

    localStorage.removeItem("gmc:lastCalc:v1");

    const lastCalc = getLastCalc();
    expect(lastCalc).toBeNull();
  });

  it("should return default rewardUnlock when key is missing", async () => {
    const { getRewardUnlock } = await import("@/lib/storage");

    localStorage.removeItem("gmc:rewardUnlock:v1");

    const unlock = getRewardUnlock();
    expect(unlock).toEqual({ statsUnlockedUntil: 0 });
  });
});
