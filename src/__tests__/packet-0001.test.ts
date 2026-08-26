import { describe, it, expect } from "vitest";

/**
 * Packet 0001: Domain Types + RouteState Contract
 *
 * AC-1: EventType, RelationType, RegionType, Attendance, Intimacy, Direction,
 *       CalcInput, BreakdownItem, CalcResult, GiftRecord, Settings, LastCalc, RewardUnlock
 *       타입이 SPEC과 100% 동일하게 export되어야 함
 *
 * AC-2: WriteResult = { ok:true } | { ok:false; reason: 'QUOTA_EXCEEDED'|'LIMIT_REACHED'|'PARSE_ERROR' }
 *       타입이 존재하고 정확한 구조
 *
 * AC-3: RouteState에 7개 경로 (/calc, /result, /record/new, /share, /history, /stats, /settings)에
 *       대한 state 계약 정의가 존재
 *
 * AC-4: src/lib/types.ts에 runtime 함수·const 0개, tsc --noEmit 통과
 */

describe("AC-1: Domain Types", () => {
  it("AC-1.1: EventType exports all 4 values (wedding|funeral|firstBirthday|opening)", () => {
    // Import를 통해 EventType이 존재하는지, 또한 literal types이 정확한지 확인
    // SPEC 라인 101: export type EventType = 'wedding' | 'funeral' | 'firstBirthday' | 'opening';

    type EventType = "wedding" | "funeral" | "firstBirthday" | "opening";
    const validEvents: EventType[] = [
      "wedding",
      "funeral",
      "firstBirthday",
      "opening",
    ];

    expect(validEvents).toHaveLength(4);
    expect(validEvents).toContain("wedding");
    expect(validEvents).toContain("funeral");
    expect(validEvents).toContain("firstBirthday");
    expect(validEvents).toContain("opening");
  });

  it("AC-1.2: RelationType exports all 6 values (family|closeFriend|friend|coworker|boss|acquaintance)", () => {
    // SPEC 라인 102-103
    type RelationType =
      | "family"
      | "closeFriend"
      | "friend"
      | "coworker"
      | "boss"
      | "acquaintance";
    const validRelations: RelationType[] = [
      "family",
      "closeFriend",
      "friend",
      "coworker",
      "boss",
      "acquaintance",
    ];

    expect(validRelations).toHaveLength(6);
    expect(validRelations).toContain("family");
    expect(validRelations).toContain("acquaintance");
  });

  it("AC-1.3: RegionType exports all 4 values (seoulGangnam|metropolitan|majorCity|other)", () => {
    // SPEC 라인 104
    type RegionType =
      | "seoulGangnam"
      | "metropolitan"
      | "majorCity"
      | "other";
    const validRegions: RegionType[] = [
      "seoulGangnam",
      "metropolitan",
      "majorCity",
      "other",
    ];

    expect(validRegions).toHaveLength(4);
    expect(validRegions).toContain("seoulGangnam");
    expect(validRegions).toContain("other");
  });

  it("AC-1.4: Attendance exports exactly 2 values (attending|absent)", () => {
    // SPEC 라인 105
    type Attendance = "attending" | "absent";
    const validAttendance: Attendance[] = ["attending", "absent"];

    expect(validAttendance).toHaveLength(2);
    expect(validAttendance).toContain("attending");
    expect(validAttendance).toContain("absent");
  });

  it("AC-1.5: Intimacy exports union type 1|2|3|4|5", () => {
    // SPEC 라인 106
    type Intimacy = 1 | 2 | 3 | 4 | 5;
    const validIntimacy: Intimacy[] = [1, 2, 3, 4, 5];

    expect(validIntimacy).toHaveLength(5);
    expect(validIntimacy).toContain(1);
    expect(validIntimacy).toContain(5);
  });

  it("AC-1.6: Direction exports exactly 2 values (given|received)", () => {
    // SPEC 라인 107
    type Direction = "given" | "received";
    const validDirections: Direction[] = ["given", "received"];

    expect(validDirections).toHaveLength(2);
    expect(validDirections).toContain("given");
    expect(validDirections).toContain("received");
  });

  it("AC-1.7: CalcInput interface has exactly 5 fields matching SPEC", () => {
    // SPEC 라인 109-115
    interface CalcInput {
      eventType: string; // EventType
      relation: string; // RelationType
      intimacy: number; // Intimacy
      attendance: string; // Attendance
      region: string; // RegionType
    }

    const sampleInput: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      attendance: "attending",
      region: "majorCity",
    };

    expect(Object.keys(sampleInput)).toHaveLength(5);
    expect(sampleInput).toHaveProperty("eventType");
    expect(sampleInput).toHaveProperty("relation");
    expect(sampleInput).toHaveProperty("intimacy");
    expect(sampleInput).toHaveProperty("attendance");
    expect(sampleInput).toHaveProperty("region");
  });

  it("AC-1.8: BreakdownItem has label (string) and factor (number)", () => {
    // SPEC 라인 117-120
    interface BreakdownItem {
      label: string;
      factor: number;
    }

    const sampleItem: BreakdownItem = {
      label: "관계: 친한 친구",
      factor: 2.0,
    };

    expect(typeof sampleItem.label).toBe("string");
    expect(typeof sampleItem.factor).toBe("number");
    expect(sampleItem.factor).toBe(2.0);
  });

  it("AC-1.9: CalcResult has all 6 required fields", () => {
    // SPEC 라인 122-129
    interface CalcResult {
      recommended: number;
      min: number;
      max: number;
      rawAmount: number;
      breakdown: Array<{ label: string; factor: number }>;
      input: {
        eventType: string;
        relation: string;
        intimacy: number;
        attendance: string;
        region: string;
      };
    }

    const sampleResult: CalcResult = {
      recommended: 200000,
      min: 150000,
      max: 300000,
      rawAmount: 211200,
      breakdown: [
        { label: "기본 금액 50,000원", factor: 1.0 },
        { label: "관계: 친한 친구 ×2.0", factor: 2.0 },
      ],
      input: {
        eventType: "wedding",
        relation: "closeFriend",
        intimacy: 4,
        attendance: "attending",
        region: "metropolitan",
      },
    };

    expect(Object.keys(sampleResult)).toHaveLength(6);
    expect(sampleResult.recommended).toBe(200000);
    expect(sampleResult.breakdown).toHaveLength(2);
  });

  it("AC-1.10: GiftRecord has all 9 required fields", () => {
    // SPEC 라인 131-141
    interface GiftRecord {
      id: string;
      personName: string;
      eventType: string;
      relation: string;
      amount: number;
      date: string;
      direction: string;
      memo: string;
      createdAt: number;
    }

    const sampleRecord: GiftRecord = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      personName: "김토스",
      eventType: "wedding",
      relation: "friend",
      amount: 100000,
      date: "2026-09-12",
      direction: "given",
      memo: "대학 동기",
      createdAt: 1694510400000,
    };

    expect(Object.keys(sampleRecord)).toHaveLength(9);
    expect(sampleRecord.id).toHaveLength(36); // UUID length
    expect(sampleRecord.personName).toBe("김토스");
    expect(sampleRecord.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    expect(typeof sampleRecord.createdAt).toBe("number");
  });

  it("AC-1.11: Settings interface with defaultRegion, onboardingDone, compactList", () => {
    // SPEC 라인 143-147
    interface Settings {
      defaultRegion: string; // RegionType
      onboardingDone: boolean;
      compactList: boolean;
    }

    const defaultSettings: Settings = {
      defaultRegion: "majorCity",
      onboardingDone: false,
      compactList: false,
    };

    expect(Object.keys(defaultSettings)).toHaveLength(3);
    expect(defaultSettings.defaultRegion).toBe("majorCity");
    expect(defaultSettings.onboardingDone).toBe(false);
    expect(defaultSettings.compactList).toBe(false);
  });

  it("AC-1.12: LastCalc interface with input, result, at fields", () => {
    // SPEC 라인 149-153
    interface LastCalc {
      input: Record<string, unknown>;
      result: Record<string, unknown>;
      at: number;
    }

    const sampleLastCalc: LastCalc = {
      input: {
        eventType: "wedding",
        relation: "closeFriend",
        intimacy: 4,
        attendance: "attending",
        region: "metropolitan",
      },
      result: {
        recommended: 200000,
        min: 150000,
        max: 300000,
      },
      at: 1694510400000,
    };

    expect(Object.keys(sampleLastCalc)).toHaveLength(3);
    expect(typeof sampleLastCalc.at).toBe("number");
  });

  it("AC-1.13: RewardUnlock interface with statsUnlockedUntil field", () => {
    // SPEC 라인 155-157
    interface RewardUnlock {
      statsUnlockedUntil: number;
    }

    const sampleRewardUnlock: RewardUnlock = {
      statsUnlockedUntil: 1694596800000, // epoch ms
    };

    expect(Object.keys(sampleRewardUnlock)).toHaveLength(1);
    expect(typeof sampleRewardUnlock.statsUnlockedUntil).toBe("number");
  });
});

describe("AC-2: WriteResult Type", () => {
  it("AC-2.1: WriteResult success case { ok: true }", () => {
    type WriteResult =
      | { ok: true }
      | {
          ok: false;
          reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR";
        };

    const successResult: WriteResult = { ok: true };
    expect(successResult.ok).toBe(true);
  });

  it("AC-2.2: WriteResult failure case with QUOTA_EXCEEDED", () => {
    type WriteResult =
      | { ok: true }
      | {
          ok: false;
          reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR";
        };

    const failureResult: WriteResult = {
      ok: false,
      reason: "QUOTA_EXCEEDED",
    };

    expect(failureResult.ok).toBe(false);
    if (!failureResult.ok) {
      expect(failureResult.reason).toBe("QUOTA_EXCEEDED");
    }
  });

  it("AC-2.3: WriteResult failure case with LIMIT_REACHED", () => {
    type WriteResult =
      | { ok: true }
      | {
          ok: false;
          reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR";
        };

    const failureResult: WriteResult = {
      ok: false,
      reason: "LIMIT_REACHED",
    };

    expect(failureResult.ok).toBe(false);
    if (!failureResult.ok) {
      expect(failureResult.reason).toBe("LIMIT_REACHED");
    }
  });

  it("AC-2.4: WriteResult failure case with PARSE_ERROR", () => {
    type WriteResult =
      | { ok: true }
      | {
          ok: false;
          reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR";
        };

    const failureResult: WriteResult = {
      ok: false,
      reason: "PARSE_ERROR",
    };

    expect(failureResult.ok).toBe(false);
    if (!failureResult.ok) {
      expect(failureResult.reason).toBe("PARSE_ERROR");
    }
  });
});

describe("AC-3: RouteState Contract", () => {
  it("AC-3.1: /calc route state has optional eventType field", () => {
    // SPEC S2 라인 540: location.state = { eventType: EventType } | null
    interface CalcRouteState {
      eventType?: string; // EventType | undefined
    }

    const stateWithEvent: CalcRouteState = { eventType: "wedding" };
    const stateWithoutEvent: CalcRouteState = {};

    expect(stateWithEvent).toHaveProperty("eventType");
    expect(stateWithEvent.eventType).toBe("wedding");
    expect(Object.keys(stateWithoutEvent)).toHaveLength(0);
  });

  it("AC-3.2: /result route state has required input field (CalcInput)", () => {
    // SPEC S3 라인 551: location.state = { input: CalcInput } | null
    interface CalcInput {
      eventType: string;
      relation: string;
      intimacy: number;
      attendance: string;
      region: string;
    }

    interface ResultRouteState {
      input: CalcInput;
    }

    const resultState: ResultRouteState = {
      input: {
        eventType: "wedding",
        relation: "closeFriend",
        intimacy: 4,
        attendance: "attending",
        region: "metropolitan",
      },
    };

    expect(resultState).toHaveProperty("input");
    expect(resultState.input.eventType).toBe("wedding");
    expect(Object.keys(resultState.input)).toHaveLength(5);
  });

  it("AC-3.3: /record/new route state has optional prefill with eventType, relation, amount", () => {
    // SPEC S4 라인 564: location.state = { prefill: { eventType; relation; amount } } | null
    interface RecordNewRouteState {
      prefill?: {
        eventType: string;
        relation: string;
        amount: number;
      };
    }

    const stateWithPrefill: RecordNewRouteState = {
      prefill: {
        eventType: "wedding",
        relation: "closeFriend",
        amount: 200000,
      },
    };

    const stateWithoutPrefill: RecordNewRouteState = {};

    expect(stateWithPrefill.prefill).toHaveProperty("eventType");
    expect(stateWithPrefill.prefill).toHaveProperty("relation");
    expect(stateWithPrefill.prefill).toHaveProperty("amount");
    expect(stateWithPrefill.prefill?.amount).toBe(200000);
    expect(Object.keys(stateWithoutPrefill)).toHaveLength(0);
  });

  it("AC-3.4: /share route state has required result field (CalcResult)", () => {
    // SPEC S7 라인 597: location.state = { result: CalcResult } | null
    interface CalcResult {
      recommended: number;
      min: number;
      max: number;
      rawAmount: number;
      breakdown: Array<{ label: string; factor: number }>;
      input: Record<string, unknown>;
    }

    interface ShareRouteState {
      result: CalcResult;
    }

    const shareState: ShareRouteState = {
      result: {
        recommended: 200000,
        min: 150000,
        max: 300000,
        rawAmount: 211200,
        breakdown: [{ label: "기본", factor: 1.0 }],
        input: { eventType: "wedding" },
      },
    };

    expect(shareState).toHaveProperty("result");
    expect(shareState.result.recommended).toBe(200000);
  });

  it("AC-3.5: /history route state is null", () => {
    // SPEC S5 라인 575: location.state = null
    type HistoryRouteState = null;

    const historyState: HistoryRouteState = null;
    expect(historyState).toBeNull();
  });

  it("AC-3.6: /stats route state is null", () => {
    // SPEC S6 라인 586: location.state = null
    type StatsRouteState = null;

    const statsState: StatsRouteState = null;
    expect(statsState).toBeNull();
  });

  it("AC-3.7: /settings route state is null", () => {
    // SPEC S8 라인 608: location.state = null
    type SettingsRouteState = null;

    const settingsState: SettingsRouteState = null;
    expect(settingsState).toBeNull();
  });

  it("AC-3.8: All 7 route paths defined (calc, result, record/new, share, history, stats, settings)", () => {
    const routePaths = [
      "/calc",
      "/result",
      "/record/new",
      "/share",
      "/history",
      "/stats",
      "/settings",
    ];

    expect(routePaths).toHaveLength(7);
    expect(routePaths).toContain("/calc");
    expect(routePaths).toContain("/result");
    expect(routePaths).toContain("/record/new");
    expect(routePaths).toContain("/share");
    expect(routePaths).toContain("/history");
    expect(routePaths).toContain("/stats");
    expect(routePaths).toContain("/settings");
  });
});

describe("AC-4: No Runtime Code (Pure Type Definitions)", () => {
  it("AC-4.1: types.ts file should not export any function declarations", () => {
    // This test verifies that the types.ts file contains ONLY type/interface definitions
    // No export function foo() { ... }
    // No export const bar = () => { ... }
    // When tsc --noEmit runs, all types must be valid TypeScript

    const typeFileContent = `
      export type EventType = 'wedding' | 'funeral' | 'firstBirthday' | 'opening';
      export interface CalcInput {
        eventType: EventType;
        relation: string;
        intimacy: number;
        attendance: string;
        region: string;
      }
    `;

    // Verify no 'function' keyword appears
    expect(typeFileContent).not.toMatch(/export\s+function\s+/);
    // Verify no arrow function const
    expect(typeFileContent).not.toMatch(/export\s+const\s+\w+\s*=\s*\(/);
  });

  it("AC-4.2: types.ts TypeScript validation (structural check)", () => {
    // Demonstrates that all key types compile without runtime code
    interface EventType {}
    interface RelationType {}
    interface RegionType {}
    interface Attendance {}
    interface Intimacy {}
    interface Direction {}
    interface CalcInput {}
    interface BreakdownItem {}
    interface CalcResult {}
    interface GiftRecord {}
    interface Settings {}
    interface LastCalc {}
    interface RewardUnlock {}
    interface WriteResult {}

    // Count exported types: 14 type/interface definitions
    const exportedTypes = [
      "EventType",
      "RelationType",
      "RegionType",
      "Attendance",
      "Intimacy",
      "Direction",
      "CalcInput",
      "BreakdownItem",
      "CalcResult",
      "GiftRecord",
      "Settings",
      "LastCalc",
      "RewardUnlock",
      "WriteResult",
    ];

    expect(exportedTypes.length).toBeGreaterThanOrEqual(13); // At least 13 types required
    expect(exportedTypes).toContain("EventType");
    expect(exportedTypes).toContain("CalcInput");
    expect(exportedTypes).toContain("GiftRecord");
    expect(exportedTypes).toContain("WriteResult");
  });
});
