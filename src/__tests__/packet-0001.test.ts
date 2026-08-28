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
        attend: true,
        inflationAdjust: false,
      };
      expect(input.eventType).toBe("wedding");
      expect(input.relationship).toBe("friends");
      expect(input.region).toBe("seoul");
      expect(input.attend).toBe(true);
      expect(input.inflationAdjust).toBe(false);
    });

    it("should support all boolean combinations for attend and inflationAdjust", () => {
      const input1: CalcInput = {
        eventType: "wedding",
        relationship: "spouse",
        region: "gyeonggi",
        attend: true,
        inflationAdjust: true,
      };
      expect(input1.attend).toBe(true);
      expect(input1.inflationAdjust).toBe(true);

      const input2: CalcInput = {
        eventType: "funeral",
        relationship: "parents",
        region: "busan",
        attend: false,
        inflationAdjust: false,
      };
      expect(input2.attend).toBe(false);
      expect(input2.inflationAdjust).toBe(false);
    });
  });

  describe("AC-1: CalcResult 정의", () => {
    it("should export CalcResult with calculated values", () => {
      const result: CalcResult = {
        recommendedAmount: 50000,
        rangeMin: 30000,
        rangeMax: 100000,
        reasons: ["기본 관례 기준", "지역별 조정 반영"],
      };
      expect(result.recommendedAmount).toBe(50000);
      expect(result.rangeMin).toBe(30000);
      expect(result.rangeMax).toBe(100000);
      expect(result.reasons).toHaveLength(2);
      expect(result.reasons[0]).toBe("기본 관례 기준");
      expect(result.reasons[1]).toBe("지역별 조정 반영");
    });

    it("should have reasons as string array with multiple entries", () => {
      const result: CalcResult = {
        recommendedAmount: 100000,
        rangeMin: 50000,
        rangeMax: 150000,
        reasons: ["결혼식 기준", "서울 지역 조정", "물가 인상 반영"],
      };
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
      result.reasons.forEach((reason) => {
        expect(typeof reason).toBe("string");
        expect(reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe("AC-1: GiftRecord 정의", () => {
    it("should export GiftRecord type for stored records", () => {
      const record: GiftRecord = {
        id: "record-123",
        personName: "김철수",
        eventType: "wedding",
        relationship: "friends",
        eventDate: "2024-06-15",
        amount: 50000,
        memo: "축의금",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(record.id).toBe("record-123");
      expect(record.personName).toBe("김철수");
      expect(record.eventType).toBe("wedding");
      expect(record.eventDate).toBe("2024-06-15");
      expect(record.amount).toBe(50000);
    });

    it("should support optional memo field", () => {
      const recordWithMemo: GiftRecord = {
        id: "r1",
        personName: "이영희",
        eventType: "funeral",
        relationship: "siblings",
        eventDate: "2024-05-20",
        amount: 30000,
        memo: "부의금",
        createdAt: 1000,
        updatedAt: 1000,
      };
      expect(recordWithMemo.memo).toBe("부의금");

      const recordWithoutMemo: GiftRecord = {
        id: "r2",
        personName: "박민수",
        eventType: "firstBirthday",
        relationship: "relatives",
        eventDate: "2024-01-10",
        amount: 100000,
        createdAt: 2000,
        updatedAt: 2000,
      };
      expect(recordWithoutMemo.memo).toBeUndefined();
    });
  });

  describe("AC-1: AppSettings 정의", () => {
    it("should export AppSettings with configuration", () => {
      const settings: AppSettings = {
        defaultRegion: "seoul",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: null,
      };
      expect(settings.defaultRegion).toBe("seoul");
      expect(settings.inflationAdjustDefault).toBe(true);
      expect(settings.rewardUnlockedUntil).toBeNull();
    });

    it("should support rewardUnlockedUntil as timestamp or null", () => {
      const settingsLocked: AppSettings = {
        defaultRegion: "gyeonggi",
        inflationAdjustDefault: false,
        rewardUnlockedUntil: null,
      };
      expect(settingsLocked.rewardUnlockedUntil).toBeNull();

      const now = Date.now();
      const settingsUnlocked: AppSettings = {
        defaultRegion: "busan",
        inflationAdjustDefault: true,
        rewardUnlockedUntil: now + 86400000,
      };
      expect(settingsUnlocked.rewardUnlockedUntil).toBeGreaterThan(now);
    });
  });

  describe("AC-1: AppErrorCode 정의", () => {
    it("should export AppErrorCode with all error variants", () => {
      const errorCodes: AppErrorCode[] = [
        401, 403, 404, 409, 413, 416, 422, 500, 507,
      ];
      expect(errorCodes).toHaveLength(9);
      expect(errorCodes).toContain(401); // Unauthorized (toss app)
      expect(errorCodes).toContain(403); // Forbidden (permission)
      expect(errorCodes).toContain(404); // Not found
      expect(errorCodes).toContain(409); // Conflict (duplicate/lock)
      expect(errorCodes).toContain(413); // Payload too large
      expect(errorCodes).toContain(416); // Range not satisfiable (end of list)
      expect(errorCodes).toContain(422); // Unprocessable entity (invalid data)
      expect(errorCodes).toContain(500); // Internal server error
      expect(errorCodes).toContain(507); // Insufficient storage
    });
  });

  describe("AC-1: Result<T> 정의", () => {
    it("should export Result type with ok: true case", () => {
      const successResult: Result<CalcResult> = {
        ok: true,
        data: {
          recommendedAmount: 50000,
          rangeMin: 30000,
          rangeMax: 100000,
          reasons: ["기준 금액", "지역 조정"],
        },
      };
      expect(successResult.ok).toBe(true);
      if (successResult.ok) {
        expect(successResult.data.recommendedAmount).toBe(50000);
      }
    });

    it("should export Result type with ok: false case", () => {
      const errorResult: Result<CalcResult> = {
        ok: false,
        error: { code: 404, message: "삭제되었거나 없는 기록이에요" },
      };
      expect(errorResult.ok).toBe(false);
      if (!errorResult.ok) {
        expect(errorResult.error.code).toBe(404);
        expect(errorResult.error.message).toBe("삭제되었거나 없는 기록이에요");
      }
    });

    it("should support multiple error codes", () => {
      const conflicts: Result<void> = {
        ok: false,
        error: { code: 409, message: "다른 화면에서 이미 수정된 기록이에요. 새로고침 후 다시 시도해주세요" },
      };
      if (!conflicts.ok) expect(conflicts.error.code).toBe(409);

      const storage: Result<void> = {
        ok: false,
        error: { code: 507, message: "저장 공간이 부족해요. 기록을 삭제하고 다시 시도해주세요" },
      };
      if (!storage.ok) expect(storage.error.code).toBe(507);
    });
  });

  describe("AC-1: RouteState 정의", () => {
    it("should define RouteState for home route", () => {
      const homeState: RouteState["/"] = undefined;
      expect(homeState).toBeUndefined();
    });

    it("should define RouteState for calc route with optional prefill", () => {
      const calcState1: RouteState["/calc"] = undefined;
      expect(calcState1).toBeUndefined();

      const calcState2: RouteState["/calc"] = {
        prefill: {
          eventType: "wedding",
          region: "seoul",
        },
      };
      expect(calcState2?.prefill?.eventType).toBe("wedding");
    });

    it("should define RouteState for result route with input", () => {
      const resultState: RouteState["/result"] = {
        input: {
          eventType: "wedding",
          relationship: "parents",
          region: "seoul",
          attend: true,
          inflationAdjust: false,
        },
        result: {
          recommendedAmount: 100000,
          rangeMin: 50000,
          rangeMax: 150000,
          reasons: ["기본 기준", "지역 조정"],
        },
      };
      expect(resultState?.input?.eventType).toBe("wedding");
      expect(resultState?.result?.recommendedAmount).toBe(100000);
    });

    it("should define RouteState for history route with prefill", () => {
      const historyState: RouteState["/history"] = {
        prefill: {
          eventType: "wedding",
          relationship: "parents",
          region: "seoul",
          attend: true,
          inflationAdjust: false,
          recommendedAmount: 100000,
        },
      };
      expect(historyState?.prefill?.eventType).toBe("wedding");
      expect(historyState?.prefill?.recommendedAmount).toBe(100000);
    });

    it("should define RouteState for share route with input and result", () => {
      const shareState: RouteState["/share"] = {
        input: {
          eventType: "funeral",
          relationship: "parents",
          region: "busan",
          attend: true,
          inflationAdjust: true,
        },
        result: {
          recommendedAmount: 50000,
          rangeMin: 30000,
          rangeMax: 100000,
          reasons: ["장례식 기준", "부산 지역"],
        },
      };
      expect(shareState?.input?.eventType).toBe("funeral");
      expect(shareState?.result?.recommendedAmount).toBe(50000);
    });

    it("should define RouteState for settings route", () => {
      const settingsState: RouteState["/settings"] = undefined;
      expect(settingsState).toBeUndefined();
    });
  });

  describe("AC-1: Type compatibility", () => {
    it("should allow all EventType values in CalcInput", () => {
      const events: EventType[] = [
        "wedding",
        "funeral",
        "firstBirthday",
        "etc",
      ];

      events.forEach((event) => {
        const input: CalcInput = {
          eventType: event,
          relationship: "friends",
          region: "seoul",
          attend: true,
          inflationAdjust: false,
        };
        expect(input.eventType).toBe(event);
      });
    });

    it("should allow all Relationship values in CalcInput", () => {
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

      relationships.forEach((rel) => {
        const input: CalcInput = {
          eventType: "wedding",
          relationship: rel,
          region: "seoul",
          attend: true,
          inflationAdjust: false,
        };
        expect(input.relationship).toBe(rel);
      });
    });

    it("should allow all Region values in CalcInput", () => {
      const regions: Region[] = [
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

      regions.forEach((region) => {
        const input: CalcInput = {
          eventType: "wedding",
          relationship: "friends",
          region,
          attend: true,
          inflationAdjust: false,
        };
        expect(input.region).toBe(region);
      });
    });
  });

  describe("AC-1: Types are exported correctly", () => {
    it("should have all required types available", () => {
      // This test just ensures all types can be imported and used
      const eventType: EventType = "wedding";
      const relationship: Relationship = "parents";
      const region: Region = "seoul";

      expect(eventType).toBeDefined();
      expect(relationship).toBeDefined();
      expect(region).toBeDefined();
    });
  });
});
