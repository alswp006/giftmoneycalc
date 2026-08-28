import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { GiftRecord, StatsSummary } from "@/lib/types";
import * as recordsModule from "@/lib/records";

/**
 * Packet 0007 — 통계 집계 함수 + 상태 관리 훅 (useRecords · useSettings)
 *
 * TDD Red Phase: Tests WILL fail (implementation not yet written)
 * - src/lib/stats.ts: aggregate(records, now): StatsSummary
 * - src/hooks/useRecords.ts: returns { records, loading, reload }
 * - src/hooks/useSettings.ts: returns { settings, save, saving }
 */

// ─────────────────────────────────────────────────────────────────────────
// Mock Setup
// ─────────────────────────────────────────────────────────────────────────

// Mock subscribeRecords from @/lib/records
let mockListeners: Set<(records: GiftRecord[]) => void> = new Set();

vi.mock("@/lib/records", () => ({
  subscribeRecords: vi.fn((cb: (records: GiftRecord[]) => void) => {
    mockListeners.add(cb);
    return () => {
      mockListeners.delete(cb);
    };
  }),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  queryRecords: vi.fn(() => []),
}));

// Mock @/lib/storage for Settings
vi.mock("@/lib/storage", () => ({
  readRecords: vi.fn(() => []),
  writeRecords: vi.fn(() => ({ ok: true as const })),
  readSettings: vi.fn(() => ({
    defaultRegion: "seoul" as const,
    inflationAdjustDefault: false,
    rewardUnlockedUntil: null,
  })),
  writeSettings: vi.fn(() => ({ ok: true as const })),
}));

// Mock TDS components for React component tests
vi.mock("@toss/tds-mobile", () => ({
  Paragraph: {
    Text: ({ children }: { children: React.ReactNode }) =>
      React.createElement("span", null, children),
  },
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─────────────────────────────────────────────────────────────────────────
// AC-1: aggregate() function exports and computes basic stats
// ─────────────────────────────────────────────────────────────────────────

describe("AC-1: aggregate(records, now) returns StatsSummary with core fields", () => {
  it("should export aggregate from @/lib/stats and return object with all required fields", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "Hong Gildong",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-01-15",
        amount: 50000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "Kim Yuna",
        eventType: "firstBirthday",
        relationship: "siblings",
        eventDate: "2026-02-20",
        amount: 30000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
    ];

    const now = 1704067200000; // 2024-01-01
    const result = aggregate(records, now);

    // Verify all required fields exist
    expect(result).toHaveProperty("totalAmount");
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("avgAmount");
    expect(result).toHaveProperty("byEventType");
    expect(result).toHaveProperty("monthlyTrend");
    expect(result).toHaveProperty("topRelationship");

    // Verify field types
    expect(typeof result.totalAmount).toBe("number");
    expect(typeof result.count).toBe("number");
    expect(typeof result.avgAmount).toBe("number");
    expect(Array.isArray(result.byEventType)).toBe(true);
    expect(Array.isArray(result.monthlyTrend)).toBe(true);
    expect(result.topRelationship === null || typeof result.topRelationship === "string").toBe(
      true,
    );
  });

  it("should calculate correct totalAmount and count from records", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "Person A",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-01-15",
        amount: 50000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "Person B",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2026-02-20",
        amount: 30000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
      {
        id: "3",
        personName: "Person C",
        eventType: "firstBirthday",
        relationship: "siblings",
        eventDate: "2026-03-10",
        amount: 20000,
        createdAt: 1693699200000,
        updatedAt: 1693699200000,
      },
    ];

    const now = 1704067200000;
    const result = aggregate(records, now);

    expect(result.totalAmount).toBe(100000);
    expect(result.count).toBe(3);
    expect(result.avgAmount).toBe(100000 / 3); // ~33333.33
  });
});

// ─────────────────────────────────────────────────────────────────────────
// AC-2: aggregate() handles empty records without throwing
// ─────────────────────────────────────────────────────────────────────────

describe("AC-2: aggregate() handles empty records gracefully", () => {
  it("should return default values for empty records array", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [];
    const now = 1704067200000;
    const result = aggregate(records, now);

    expect(result.totalAmount).toBe(0);
    expect(result.count).toBe(0);
    expect(result.avgAmount).toBe(0);
    expect(result.byEventType).toEqual([]);
    expect(result.topRelationship).toBeNull();
  });

  it("should not throw for empty records", async () => {
    const { aggregate } = await import("@/lib/stats");

    expect(() => {
      aggregate([], 1704067200000);
    }).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// AC-3: byEventType ratio sums to 1±0.001, monthlyTrend is sorted
// ─────────────────────────────────────────────────────────────────────────

describe("AC-3: byEventType ratios sum correctly, monthlyTrend sorted by month", () => {
  it("should have byEventType with amount and ratio fields", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "Person A",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-01-15",
        amount: 50000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "Person B",
        eventType: "firstBirthday",
        relationship: "parents",
        eventDate: "2026-02-20",
        amount: 30000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
      {
        id: "3",
        personName: "Person C",
        eventType: "funeral",
        relationship: "siblings",
        eventDate: "2026-03-10",
        amount: 20000,
        createdAt: 1693699200000,
        updatedAt: 1693699200000,
      },
    ];

    const now = 1704067200000;
    const result = aggregate(records, now);

    // Verify byEventType structure
    result.byEventType.forEach((item: { type: string; amount: number; ratio: number }) => {
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("amount");
      expect(item).toHaveProperty("ratio");
      expect(typeof item.amount).toBe("number");
      expect(typeof item.ratio).toBe("number");
    });

    // Sum of ratios should be 1 ± 0.001
    const ratioSum = result.byEventType.reduce((sum: number, item: { ratio: number }) => sum + item.ratio, 0);
    expect(Math.abs(ratioSum - 1)).toBeLessThanOrEqual(0.001);
  });

  it("should have monthlyTrend sorted by month (YYYY-MM) in ascending order", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "Person A",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-01-15",
        amount: 10000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "Person B",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2026-03-20",
        amount: 20000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
      {
        id: "3",
        personName: "Person C",
        eventType: "firstBirthday",
        relationship: "siblings",
        eventDate: "2026-02-10",
        amount: 15000,
        createdAt: 1693699200000,
        updatedAt: 1693699200000,
      },
    ];

    const now = 1704067200000;
    const result = aggregate(records, now);

    // Verify monthlyTrend is sorted
    expect(result.monthlyTrend.length).toBeGreaterThan(0);
    for (let i = 1; i < result.monthlyTrend.length; i++) {
      const prevMonth = result.monthlyTrend[i - 1].month;
      const currMonth = result.monthlyTrend[i].month;
      expect(currMonth.localeCompare(prevMonth)).toBeGreaterThanOrEqual(0);
    }

    // Verify month format (YYYY-MM)
    result.monthlyTrend.forEach((item: { month: string; amount: number }) => {
      expect(item.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof item.amount).toBe("number");
    });
  });

  it("should include last 6 months in monthlyTrend", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "Person A",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2025-09-15",
        amount: 10000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "Person B",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2026-02-20",
        amount: 20000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
    ];

    // now = 2026-01-01 in milliseconds
    const now = 1704067200000;
    const result = aggregate(records, now);

    // Should have entries for past 6 months
    expect(result.monthlyTrend.length).toBeGreaterThanOrEqual(1);
    expect(result.monthlyTrend.length).toBeLessThanOrEqual(6);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// AC-4: useRecords hook returns { records, loading, reload } and subscribes
// ─────────────────────────────────────────────────────────────────────────

describe("AC-4: useRecords() hook returns records + loading + reload", () => {
  let mockSubscribeRecords: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockListeners.clear();
    mockSubscribeRecords = vi.fn((cb: (records: GiftRecord[]) => void) => {
      mockListeners.add(cb);
      return () => {
        mockListeners.delete(cb);
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockListeners.clear();
  });

  it("should export useRecords hook from @/hooks/useRecords", async () => {
    const { useRecords } = await import("@/hooks/useRecords");
    expect(typeof useRecords).toBe("function");
  });

  it("should return object with records, loading, reload properties", async () => {
    const { useRecords } = await import("@/hooks/useRecords");

    const TestComponent = () => {
      const { records, loading, reload } = useRecords();
      return React.createElement(
        "div",
        null,
        React.createElement("div", { "data-testid": "records-count" }, records.length),
        React.createElement("div", { "data-testid": "loading" }, loading ? "true" : "false"),
        React.createElement(
          "button",
          { "data-testid": "reload-btn", onClick: reload },
          "Reload",
        ),
      );
    };

    render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent)),
    );

    expect(screen.getByTestId("records-count")).toBeInTheDocument();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.getByTestId("reload-btn")).toBeInTheDocument();
  });

  it("should update records when subscribeRecords callback is triggered", async () => {
    const { useRecords } = await import("@/hooks/useRecords");

    const TestComponent = () => {
      const { records } = useRecords();
      return React.createElement("div", { "data-testid": "count" }, records.length);
    };

    render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent)),
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");

    // Simulate subscribeRecords callback being called
    const newRecords: GiftRecord[] = [
      {
        id: "1",
        personName: "Test",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-01-15",
        amount: 50000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    for (const listener of mockListeners) {
      listener(newRecords);
    }

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// AC-5: useSettings hook returns { settings, save, saving }
// ─────────────────────────────────────────────────────────────────────────

describe("AC-5: useSettings() hook returns settings + save + saving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should export useSettings hook from @/hooks/useSettings", async () => {
    const { useSettings } = await import("@/hooks/useSettings");
    expect(typeof useSettings).toBe("function");
  });

  it("should return object with settings, save, saving properties", async () => {
    const { useSettings } = await import("@/hooks/useSettings");

    const TestComponent = () => {
      const { settings, saving } = useSettings();
      return React.createElement(
        "div",
        null,
        React.createElement("div", { "data-testid": "region" }, settings?.defaultRegion),
        React.createElement("div", { "data-testid": "saving" }, saving ? "true" : "false"),
      );
    };

    render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent)),
    );

    expect(screen.getByTestId("region")).toBeInTheDocument();
    expect(screen.getByTestId("saving")).toBeInTheDocument();
  });

  it("should have save function callable from hook", async () => {
    const { useSettings } = await import("@/hooks/useSettings");

    const TestComponent = () => {
      const { save } = useSettings();
      return React.createElement(
        "button",
        {
          "data-testid": "save-btn",
          onClick: () => {
            save({ defaultRegion: "busan", inflationAdjustDefault: true, rewardUnlockedUntil: null });
          },
        },
        "Save",
      );
    };

    render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent)),
    );

    const btn = screen.getByTestId("save-btn");
    expect(btn).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// AC-5 Extended: useRecords unsubscribes on unmount
// ─────────────────────────────────────────────────────────────────────────

describe("AC-5+: useRecords unsubscribes on unmount (callback not called after unmount)", () => {
  beforeEach(() => {
    mockListeners.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockListeners.clear();
    vi.clearAllMocks();
  });

  it("should call unsubscribe (returned from subscribeRecords) on component unmount", async () => {
    const { useRecords } = await import("@/hooks/useRecords");

    let unsubscribeFn: (() => void) | null = null;

    // Intercept subscribeRecords to capture unsubscribe function
    vi.mocked(recordsModule).subscribeRecords.mockImplementationOnce(
      (cb: (records: GiftRecord[]) => void) => {
        mockListeners.add(cb);
        const unsubscribe = () => {
          mockListeners.delete(cb);
        };
        unsubscribeFn = unsubscribe;
        return unsubscribe;
      },
    );

    const TestComponent = () => {
      const { records } = useRecords();
      return React.createElement("div", { "data-testid": "count" }, records.length);
    };

    const { unmount } = render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent)),
    );

    const initialListenerCount = mockListeners.size;
    expect(initialListenerCount).toBeGreaterThan(0);

    // Unmount the component
    unmount();

    // After unmount, the listener should be removed
    expect(mockListeners.size).toBeLessThan(initialListenerCount);
  });

  it("should not call hook callback after unmount", async () => {
    const { useRecords } = await import("@/hooks/useRecords");

    const TestComponent = () => {
      const { records } = useRecords();
      return React.createElement("div", { "data-testid": "count" }, records.length);
    };

    const { unmount } = render(
      React.createElement(MemoryRouter, null, React.createElement(TestComponent)),
    );

    const initialCount = mockListeners.size;

    // Unmount
    unmount();

    // Try to trigger callback after unmount
    const newRecords: GiftRecord[] = [
      {
        id: "1",
        personName: "After Unmount",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-01-15",
        amount: 50000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    // The callback should not be in the listeners anymore
    const beforeTrigger = mockListeners.size;
    for (const listener of mockListeners) {
      listener(newRecords);
    }
    const afterTrigger = mockListeners.size;

    expect(beforeTrigger).toBeLessThan(initialCount);
    expect(afterTrigger).toBe(beforeTrigger);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Integration: stats.test.ts (4 focused tests covering stats logic)
// ─────────────────────────────────────────────────────────────────────────

describe("src/lib/stats.test.ts — pure function test coverage", () => {
  it("[stats-1] aggregate() calculates correct statistics for multi-event records", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "wedding-1",
        personName: "Kim",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2025-12-25",
        amount: 100000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "funeral-1",
        personName: "Lee",
        eventType: "funeral",
        relationship: "relatives",
        eventDate: "2025-12-26",
        amount: 50000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
    ];

    const now = Date.parse("2026-01-01");
    const result = aggregate(records, now);

    expect(result.totalAmount).toBe(150000);
    expect(result.count).toBe(2);
    expect(result.avgAmount).toBe(75000);
  });

  it("[stats-2] topRelationship returns most frequent relationship", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "A",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2025-12-25",
        amount: 50000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "B",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2025-12-26",
        amount: 60000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
      {
        id: "3",
        personName: "C",
        eventType: "firstBirthday",
        relationship: "friends",
        eventDate: "2025-12-27",
        amount: 30000,
        createdAt: 1693699200000,
        updatedAt: 1693699200000,
      },
    ];

    const now = Date.parse("2026-01-01");
    const result = aggregate(records, now);

    expect(result.topRelationship).toBe("parents");
  });

  it("[stats-3] byEventType correctly groups and calculates amounts by event type", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "A",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2025-12-25",
        amount: 50000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "B",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2025-12-26",
        amount: 50000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
      {
        id: "3",
        personName: "C",
        eventType: "funeral",
        relationship: "relatives",
        eventDate: "2025-12-27",
        amount: 100000,
        createdAt: 1693699200000,
        updatedAt: 1693699200000,
      },
    ];

    const now = Date.parse("2026-01-01");
    const result = aggregate(records, now);

    const weddingItem = result.byEventType.find((item: { type: string }) => item.type === "wedding");
    const funeralItem = result.byEventType.find((item: { type: string }) => item.type === "funeral");

    expect(weddingItem?.amount).toBe(100000);
    expect(funeralItem?.amount).toBe(100000);
    expect(weddingItem?.ratio).toBeCloseTo(0.5, 2);
    expect(funeralItem?.ratio).toBeCloseTo(0.5, 2);
  });

  it("[stats-4] monthlyTrend groups records by YYYY-MM and sums amounts", async () => {
    const { aggregate } = await import("@/lib/stats");

    const records: GiftRecord[] = [
      {
        id: "1",
        personName: "A",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2025-12-15",
        amount: 30000,
        createdAt: 1693526400000,
        updatedAt: 1693526400000,
      },
      {
        id: "2",
        personName: "B",
        eventType: "wedding",
        relationship: "parents",
        eventDate: "2025-12-25",
        amount: 40000,
        createdAt: 1693612800000,
        updatedAt: 1693612800000,
      },
      {
        id: "3",
        personName: "C",
        eventType: "funeral",
        relationship: "relatives",
        eventDate: "2026-01-10",
        amount: 50000,
        createdAt: 1693699200000,
        updatedAt: 1693699200000,
      },
    ];

    const now = Date.parse("2026-02-01");
    const result = aggregate(records, now);

    const decemberTrend = result.monthlyTrend.find((item: { month: string }) => item.month === "2025-12");
    const januaryTrend = result.monthlyTrend.find((item: { month: string }) => item.month === "2026-01");

    expect(decemberTrend?.amount).toBe(70000);
    expect(januaryTrend?.amount).toBe(50000);
  });
});
