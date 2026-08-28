import { describe, it, expect } from "vitest";
import type { CalcInput, CalcResult, EventType, Relationship, Region } from "@/lib/types";

describe("Packet 0006 — 계산 엔진 (rules.ts 상수 격리 + calc.ts 결정론 함수)", () => {
  // AC-1: rules.ts가 상수만 export하고 함수 0개
  describe("AC-1: rules.ts structure", () => {
    it("should export only constants from rules.ts with no function declarations", async () => {
      // This test will be verified by:
      // 1. Importing rules.ts and checking that all exports are constants (non-functions)
      // 2. Manual grep check: grep -rn 'function\|export const.*=' src/lib/rules.ts
      // For now, we just import to ensure it exists and can be loaded
      const rules = await import("@/lib/rules");

      expect(rules).toBeDefined();

      // Verify exported constants exist (structure, not implementation)
      // These are placeholders for the actual constant names that will be defined
      const exportedKeys = Object.keys(rules);
      expect(exportedKeys.length).toBeGreaterThan(0);

      // Verify no functions are exported (all must be non-callable)
      exportedKeys.forEach((key) => {
        const value = (rules as any)[key];
        expect(typeof value).not.toBe("function");
      });
    });
  });

  // AC-2: calculate() 함수가 동일 입력에 대해 100회 호출 시 100회 모두 동일 객체 값을 반환
  describe("AC-2: deterministic calculation (100 runs)", () => {
    it("should return identical result values for 100 identical calls", async () => {
      const { calculate } = await import("@/lib/calc");

      const input: CalcInput = {
        eventType: "wedding",
        relationship: "parents",
        region: "seoul",
        attend: true,
        inflationAdjust: true,
      };

      const results: CalcResult[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(calculate(input));
      }

      // All results must have identical values
      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result.recommendedAmount, `run ${index}`).toBe(firstResult.recommendedAmount);
        expect(result.rangeMin, `run ${index}`).toBe(firstResult.rangeMin);
        expect(result.rangeMax, `run ${index}`).toBe(firstResult.rangeMax);
        expect(result.reasons, `run ${index}`).toEqual(firstResult.reasons);
      });
    });
  });

  // AC-3: 반환 금액이 항상 10,000원 단위로 반올림되고 rangeMin <= recommendedAmount <= rangeMax 만족
  describe("AC-3: amount rounding and range validation", () => {
    it("should round recommended amount to 10,000 won units", async () => {
      const { calculate } = await import("@/lib/calc");

      const testCases: CalcInput[] = [
        { eventType: "wedding", relationship: "parents", region: "seoul", attend: true, inflationAdjust: true },
        { eventType: "funeral", relationship: "siblings", region: "busan", attend: false, inflationAdjust: false },
        { eventType: "firstBirthday", relationship: "spouse", region: "daegu", attend: true, inflationAdjust: false },
        { eventType: "etc", relationship: "colleagues", region: "gyeonggi", attend: false, inflationAdjust: true },
      ];

      testCases.forEach((input) => {
        const result = calculate(input);

        // recommendedAmount must be divisible by 10,000 (no remainder)
        expect(result.recommendedAmount % 10000).toBe(0);
        // rangeMin must also be divisible by 10,000
        expect(result.rangeMin % 10000).toBe(0);
        // rangeMax must also be divisible by 10,000
        expect(result.rangeMax % 10000).toBe(0);
      });
    });

    it("should satisfy rangeMin <= recommendedAmount <= rangeMax", async () => {
      const { calculate } = await import("@/lib/calc");

      const testCases: CalcInput[] = [
        { eventType: "wedding", relationship: "parents", region: "seoul", attend: true, inflationAdjust: true },
        { eventType: "funeral", relationship: "siblings", region: "busan", attend: false, inflationAdjust: false },
        { eventType: "firstBirthday", relationship: "spouse", region: "daegu", attend: true, inflationAdjust: false },
        { eventType: "etc", relationship: "colleagues", region: "gyeonggi", attend: false, inflationAdjust: true },
        { eventType: "wedding", relationship: "friends", region: "incheon", attend: true, inflationAdjust: false },
      ];

      testCases.forEach((input) => {
        const result = calculate(input);

        expect(result.rangeMin).toBeLessThanOrEqual(result.recommendedAmount);
        expect(result.recommendedAmount).toBeLessThanOrEqual(result.rangeMax);
      });
    });
  });

  // AC-4: reasons 배열 길이가 항상 2 이상이고 각 원소가 빈 문자열이 아님
  describe("AC-4: reasons array validation", () => {
    it("should have at least 2 non-empty reasons", async () => {
      const { calculate } = await import("@/lib/calc");

      const testCases: CalcInput[] = [
        { eventType: "wedding", relationship: "parents", region: "seoul", attend: true, inflationAdjust: true },
        { eventType: "funeral", relationship: "siblings", region: "busan", attend: false, inflationAdjust: false },
        { eventType: "firstBirthday", relationship: "spouse", region: "daegu", attend: true, inflationAdjust: false },
        { eventType: "etc", relationship: "colleagues", region: "gyeonggi", attend: false, inflationAdjust: true },
        { eventType: "wedding", relationship: "boss", region: "seoul", attend: true, inflationAdjust: true },
        { eventType: "funeral", relationship: "acquaintance", region: "gwangju", attend: false, inflationAdjust: false },
      ];

      testCases.forEach((input) => {
        const result = calculate(input);

        // reasons must be an array
        expect(Array.isArray(result.reasons)).toBe(true);

        // reasons must have at least 2 elements
        expect(result.reasons.length).toBeGreaterThanOrEqual(2);

        // each element must be a non-empty string
        result.reasons.forEach((reason, index) => {
          expect(typeof reason).toBe("string");
          expect(reason.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // AC-5: calc.ts에 Math.random/Date.now 사용 0건, 행사유형 4종 × 관계 등급 전체 테이블 테스트
  describe("AC-5: table test for all event types and relationships", () => {
    const eventTypes: EventType[] = ["wedding", "funeral", "firstBirthday", "etc"];
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
    const region: Region = "seoul";

    eventTypes.forEach((eventType) => {
      relationships.forEach((relationship) => {
        it(`should calculate valid result for ${eventType} + ${relationship}`, async () => {
          const { calculate } = await import("@/lib/calc");

          const input: CalcInput = {
            eventType,
            relationship,
            region,
            attend: true,
            inflationAdjust: false,
          };

          const result = calculate(input);

          // Verify structure
          expect(result).toHaveProperty("recommendedAmount");
          expect(result).toHaveProperty("rangeMin");
          expect(result).toHaveProperty("rangeMax");
          expect(result).toHaveProperty("reasons");

          // Verify types
          expect(typeof result.recommendedAmount).toBe("number");
          expect(typeof result.rangeMin).toBe("number");
          expect(typeof result.rangeMax).toBe("number");
          expect(Array.isArray(result.reasons)).toBe(true);

          // Verify values are positive and meaningful
          expect(result.recommendedAmount).toBeGreaterThan(0);
          expect(result.rangeMin).toBeGreaterThan(0);
          expect(result.rangeMax).toBeGreaterThan(0);

          // Verify monetary amounts are integers (won)
          expect(Number.isInteger(result.recommendedAmount)).toBe(true);
          expect(Number.isInteger(result.rangeMin)).toBe(true);
          expect(Number.isInteger(result.rangeMax)).toBe(true);

          // Verify rounding to 10,000
          expect(result.recommendedAmount % 10000).toBe(0);
          expect(result.rangeMin % 10000).toBe(0);
          expect(result.rangeMax % 10000).toBe(0);

          // Verify range constraint
          expect(result.rangeMin).toBeLessThanOrEqual(result.recommendedAmount);
          expect(result.recommendedAmount).toBeLessThanOrEqual(result.rangeMax);

          // Verify reasons
          expect(result.reasons.length).toBeGreaterThanOrEqual(2);
          result.reasons.forEach((reason) => {
            expect(reason.length).toBeGreaterThan(0);
          });
        });
      });
    });

    it("should test all regions for at least one event+relationship combo", async () => {
      const { calculate } = await import("@/lib/calc");

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

      const input: CalcInput = {
        eventType: "wedding",
        relationship: "parents",
        region: "seoul",
        attend: true,
        inflationAdjust: false,
      };

      regions.forEach((region) => {
        const result = calculate({ ...input, region });

        // All regions should produce valid results
        expect(result.recommendedAmount).toBeGreaterThan(0);
        expect(result.rangeMin).toBeGreaterThan(0);
        expect(result.rangeMax).toBeGreaterThan(0);
        expect(result.reasons.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("should handle attend and inflationAdjust flags", async () => {
      const { calculate } = await import("@/lib/calc");

      const baseInput: CalcInput = {
        eventType: "wedding",
        relationship: "parents",
        region: "seoul",
        attend: true,
        inflationAdjust: false,
      };

      // Test all combinations of boolean flags
      const attendValues = [true, false];
      const inflationValues = [true, false];

      attendValues.forEach((attend) => {
        inflationValues.forEach((inflate) => {
          const result = calculate({ ...baseInput, attend, inflationAdjust: inflate });

          // All combinations should produce valid results
          expect(result.recommendedAmount).toBeGreaterThan(0);
          expect(result.rangeMin).toBeGreaterThan(0);
          expect(result.rangeMax).toBeGreaterThan(0);
          expect(result.reasons.length).toBeGreaterThanOrEqual(2);
        });
      });
    });
  });

  // Additional test: Verify no randomness or time-dependent behavior
  describe("AC-5 (verification): no Math.random or Date.now", () => {
    it("should use only constant-based calculation without randomness", async () => {
      // This is verified via grep check in CI:
      // grep -rn 'Math.random\|Date.now' src/lib/calc.ts src/lib/rules.ts
      // For test, we verify determinism through repeated calls
      const { calculate } = await import("@/lib/calc");

      const input: CalcInput = {
        eventType: "wedding",
        relationship: "parents",
        region: "seoul",
        attend: true,
        inflationAdjust: true,
      };

      const result1 = calculate(input);
      const result2 = calculate(input);
      const result3 = calculate(input);

      // All three calls must return identical values (no randomness)
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
