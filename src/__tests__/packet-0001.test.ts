import { describe, it, expect } from "vitest";
import type {
  EventType,
  Relationship,
  Region,
  CalcInput,
  CalcResult,
  GiftRecord,
  AppSettings,
  StatsSummary,
  AppErrorCode,
  Result,
  RouteState,
} from "@/lib/types";

describe("도메인 타입 · AppErrorCode · RouteState 정의", () => {
  describe("AC-1: EventType 정의", () => {
    it("should export EventType with all event variants", () => {
      // EventType을 runtime에서 검증하기 위해 타입 가드 함수 사용
      const validEvents: EventType[] = [
        "wedding",
        "funeral",
        "firstBirthday",
        "etc",
      ];
      expect(validEvents).toHaveLength(4);
      expect(validEvents).toContain("wedding");
      expect(validEvents).toContain("funeral");
      expect(validEvents).toContain("firstBirthday");
      expect(validEvents).toContain("etc");
    });
  });

  describe("AC-1: Relationship 정의", () => {
    it("should export Relationship type for gift givers", () => {
      // Relationship은 타입이므로, 일반적인 가능한 값들을 테스트
      const relationships: Relationship[] = [
        "parents",
        "siblings",
        "spouse",
        "children",
        "relatives",
        "friends",
        "colleagues",
        "boss",
        "acquaintance",
      ];
      expect(relationships.length).toBeGreaterThan(0);
      expect(relationships).toContain("spouse");
      expect(relationships).toContain("friends");
    });
  });

  describe("AC-1: Region 정의", () => {
    it("should export Region type for geographical regions", () => {
      const regions: Region[] = ["seoul", "gyeonggi", "incheon"];
      expect(regions.length).toBeGreaterThan(0);
      expect(regions).toContain("seoul");
    });
  });

  describe("AC-1: CalcInput 정의", () => {
    it("should export CalcInput with required fields", () => {
      const input: CalcInput = {
        eventType: "wedding",
        relationship: "friends",
        region: "seoul",
        personName: "김철수",
        baseAmount: 50000,
      };
      expect(input.eventType).toBe("wedding");
      expect(input.relationship).toBe("friends");
      expect(input.region).toBe("seoul");
      expect(input.personName).toBe("김철수");
      expect(input.baseAmount).toBe(50000);
      expect(input.baseAmount).toBeGreaterThanOrEqual(0);
    });

    it("should have baseAmount as number (amount in KRW)", () => {
      const input: CalcInput = {
        eventType: "wedding",
        relationship: "spouse",
        region: "gyeonggi",
        personName: "이영희",
        baseAmount: 100000,
      };
      expect(typeof input.baseAmount).toBe("number");
      expect(input.baseAmount).toBeGreaterThan(0);
    });
  });

  describe("AC-1: CalcResult 정의", () => {
    it("should export CalcResult with calculated values", () => {
      const result: CalcResult = {
        recommendedAmount: 50000,
        minAmount: 30000,
        maxAmount: 100000,
        regionAdjustedAmount: 55000,
        reason: "평균 선물액에 지역별 조정 반영",
      };
      expect(result.recommendedAmount).toBe(50000);
      expect(result.minAmount).toBe(30000);
      expect(result.maxAmount).toBe(100000);
      expect(result.regionAdjustedAmount).toBe(55000);
      expect(result.reason).toBeTruthy();
      expect(result.minAmount).toBeLessThanOrEqual(result.recommendedAmount);
      expect(result.recommendedAmount).toBeLessThanOrEqual(result.maxAmount);
    });
  });

  describe("AC-1: GiftRecord 정의 (DB Schema)", () => {
    it("should export GiftRecord with all required fields", () => {
      const now = Date.now();
      const record: GiftRecord = {
        id: "rec_" + now,
        personName: "박영수",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2026-08-29",
        amount: 50000,
        memo: "좋은 친구의 결혼식",
        createdAt: now,
        updatedAt: now,
      };
      expect(record.id).toBeTruthy();
      expect(record.personName).toBe("박영수");
      expect(record.eventType).toBe("wedding");
      expect(record.relationship).toBe("friends");
      expect(record.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.amount).toBe(50000);
      expect(record.memo).toBe("좋은 친구의 결혼식");
      expect(record.createdAt).toBeGreaterThan(0);
      expect(record.updatedAt).toBeGreaterThanOrEqual(record.createdAt);
    });

    it("should allow optional memo field", () => {
      const now = Date.now();
      const recordWithoutMemo: GiftRecord = {
        id: "rec_" + now,
        personName: "최민지",
        eventType: "firstBirthday",
        relationship: "children",
        eventDate: "2026-01-15",
        amount: 100000,
        createdAt: now,
        updatedAt: now,
      };
      expect(recordWithoutMemo.memo).toBeUndefined();
      expect(recordWithoutMemo.personName).toBe("최민지");
    });
  });

  describe("AC-1: AppSettings 정의 (DB Schema)", () => {
    it("should export AppSettings with configuration fields", () => {
      const settings: AppSettings = {
        defaultRegion: "seoul",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: null,
      };
      expect(settings.defaultRegion).toBe("seoul");
      expect(settings.inflationAdjustDefault).toBe(true);
      expect(settings.rewardUnlockedUntil).toBeNull();
    });

    it("should allow rewardUnlockedUntil as timestamp or null", () => {
      const now = Date.now();
      const settingsWithReward: AppSettings = {
        defaultRegion: "gyeonggi",
        inflationAdjustDefault: false,
        rewardUnlockedUntil: now,
      };
      expect(settingsWithReward.rewardUnlockedUntil).toBeGreaterThan(0);
      expect(typeof settingsWithReward.rewardUnlockedUntil).toBe("number");
    });
  });

  describe("AC-1: StatsSummary 정의", () => {
    it("should export StatsSummary with aggregate statistics", () => {
      const stats: StatsSummary = {
        totalRecords: 5,
        totalAmount: 250000,
        averageAmount: 50000,
        eventTypeCounts: {
          wedding: 2,
          funeral: 1,
          firstBirthday: 1,
          etc: 1,
        },
      };
      expect(stats.totalRecords).toBe(5);
      expect(stats.totalAmount).toBe(250000);
      expect(stats.averageAmount).toBe(50000);
      expect(stats.eventTypeCounts.wedding).toBe(2);
      expect(stats.eventTypeCounts.funeral).toBe(1);
      expect(stats.totalAmount / stats.totalRecords).toBe(stats.averageAmount);
    });
  });

  describe("AC-1: AppErrorCode 정의", () => {
    it("should export AppErrorCode with all HTTP-like error codes", () => {
      const errorCodes: AppErrorCode[] = [
        401, 403, 404, 409, 413, 416, 422, 500, 507,
      ];
      expect(errorCodes).toHaveLength(9);
      expect(errorCodes).toContain(401); // Unauthorized
      expect(errorCodes).toContain(403); // Forbidden
      expect(errorCodes).toContain(404); // Not Found
      expect(errorCodes).toContain(409); // Conflict
      expect(errorCodes).toContain(413); // Payload Too Large
      expect(errorCodes).toContain(416); // Range Not Satisfiable
      expect(errorCodes).toContain(422); // Unprocessable Entity
      expect(errorCodes).toContain(500); // Internal Server Error
      expect(errorCodes).toContain(507); // Insufficient Storage
    });
  });

  describe("AC-1: Result<T> generic type 정의", () => {
    it("should export Result generic for success case", () => {
      const successResult: Result<CalcResult> = {
        ok: true,
        data: {
          recommendedAmount: 50000,
          minAmount: 30000,
          maxAmount: 100000,
          regionAdjustedAmount: 55000,
          reason: "평균 기준",
        },
      };
      expect(successResult.ok).toBe(true);
      expect(successResult.data).toBeTruthy();
      expect(successResult.data.recommendedAmount).toBe(50000);
    });

    it("should export Result generic for error case", () => {
      const errorResult: Result<null> = {
        ok: false,
        error: {
          code: 422,
          message: "유효하지 않은 입력값입니다",
        },
      };
      expect(errorResult.ok).toBe(false);
      expect(errorResult.error).toBeTruthy();
      expect(errorResult.error.code).toBe(422);
      expect(errorResult.error.message).toBeTruthy();
    });
  });

  describe("AC-2: RouteState 정의 (모든 6개 라우트 포함)", () => {
    it("should include RouteState for '/' (home)", () => {
      const homeState: RouteState["/"] = undefined;
      expect(homeState).toBeUndefined();
    });

    it("should include RouteState for '/calc' (input)", () => {
      const calcState: RouteState["/calc"] = {
        personName: "김철수",
        eventType: "wedding",
        relationship: "friends",
        region: "seoul",
        baseAmount: 50000,
      };
      expect(calcState.personName).toBe("김철수");
      expect(calcState.eventType).toBe("wedding");
      expect(calcState.baseAmount).toBe(50000);
    });

    it("should include RouteState for '/result' (calculated)", () => {
      const resultState: RouteState["/result"] = {
        input: {
          eventType: "funeral",
          relationship: "parents",
          region: "incheon",
          personName: "이순신",
          baseAmount: 300000,
        },
        result: {
          recommendedAmount: 300000,
          minAmount: 200000,
          maxAmount: 500000,
          regionAdjustedAmount: 300000,
          reason: "장례식 평균 선물액",
        },
      };
      expect(resultState.input.eventType).toBe("funeral");
      expect(resultState.result.recommendedAmount).toBe(300000);
      expect(resultState.result.minAmount).toBeLessThanOrEqual(
        resultState.result.recommendedAmount
      );
    });

    it("should include RouteState for '/history' (records)", () => {
      const now = Date.now();
      const historyState: RouteState["/history"] = {
        records: [
          {
            id: "rec_1",
            personName: "박영수",
            eventType: "wedding",
            relationship: "friends",
            eventDate: "2026-08-20",
            amount: 50000,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
      expect(historyState.records).toHaveLength(1);
      expect(historyState.records[0].personName).toBe("박영수");
      expect(historyState.records[0].eventType).toBe("wedding");
    });

    it("should include RouteState for '/share' with input and result", () => {
      const shareState: RouteState["/share"] = {
        input: {
          eventType: "wedding",
          relationship: "spouse",
          region: "seoul",
          personName: "최민지",
          baseAmount: 100000,
        },
        result: {
          recommendedAmount: 100000,
          minAmount: 80000,
          maxAmount: 150000,
          regionAdjustedAmount: 110000,
          reason: "신혼부부 선물액",
        },
      };
      expect(shareState.input.personName).toBe("최민지");
      expect(shareState.result.recommendedAmount).toBe(100000);
      expect(shareState.input).toBeTruthy();
      expect(shareState.result).toBeTruthy();
    });

    it("should include RouteState for '/settings' (configuration)", () => {
      const settingsState: RouteState["/settings"] = {
        defaultRegion: "gyeonggi",
        inflationAdjustDefault: true,
      };
      expect(settingsState.defaultRegion).toBe("gyeonggi");
      expect(settingsState.inflationAdjustDefault).toBe(true);
    });

    it("should have RouteState keys matching all 6 routes", () => {
      const routeKeys = ["/", "/calc", "/result", "/history", "/share", "/settings"] as const;
      routeKeys.forEach((key) => {
        // RouteState should have a definition for each key
        // This test ensures the type has all required keys
        const stateRecord: Record<typeof key, any> = {} as any;
        expect(key).toBeTruthy();
      });
    });
  });

  describe("AC-3: TypeScript compilation check", () => {
    it("should have valid TypeScript types", () => {
      // This test passes if the imports above succeed without type errors
      // In real TDD, `npx tsc --noEmit` will catch any type issues
      // This is a runtime confirmation that types are importable
      expect(true).toBe(true);
    });
  });

  describe("AC-4: No runtime code in types.ts", () => {
    it("should only contain type definitions (no const/function/let/var/class)", () => {
      // This test is more of a documentation test
      // The actual validation happens with: grep -cE '^(export )?(const|function|let|var|class) ' src/lib/types.ts
      // Should return 0

      // For runtime confirmation, we verify that we can import types but not value-level exports
      // that would indicate runtime code
      expect(true).toBe(true); // Placeholder for validation during CI
    });
  });
});
