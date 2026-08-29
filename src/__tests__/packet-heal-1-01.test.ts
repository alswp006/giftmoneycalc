import { describe, it, expect } from "vitest";
import { normalizeCalcInput, safeCalculate } from "../lib/calc";
import type { CalcInput } from "../types/calc";

/**
 * 계산 코어 입력 정규화 및 안전 가드 (Packet: heal-1-01)
 *
 * AC-1: SPEC 검증 예시 A/B/C/D가 기존 recommended·range 값 그대로 통과한다
 * AC-2: eventType/relation이 undefined·빈문자열·미지의 값일 때 예외 없이 null을 반환한다
 * AC-3: intimacy가 0·6·NaN·undefined여도 clamp/기본값 3으로 처리되어 크래시가 없다
 * AC-4: wedding+attend가 아닌 조합에서 venue가 들어와도 hotel 가산 30000이 적용되지 않는다
 * AC-5: 계산 모듈 전체에 undefined 가능성이 있는 `.length` 직접 접근이 없다
 */

// =============================================================================
// AC-1: SPEC 검증 예시 A/B/C/D 불변성
// =============================================================================

describe("AC-1: SPEC validation examples preserve existing values", () => {
  it("should calculate consistent results for spec example A", () => {
    // Spec Example A: 결혼식, 친구, 친밀도 3, 서울, 참석, 호텔 있음
    // 예상 결과: recommended = 100000, min = 80000, max = 120000
    const input: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: "hotel",
    };

    const result = safeCalculate(input);
    expect(result).not.toBeNull();
    expect(result!.recommended).toBe(100000);
    expect(result!.rangeMin).toBe(80000);
    expect(result!.rangeMax).toBe(120000);
  });

  it("should calculate consistent results for spec example B", () => {
    // Spec Example B: 돌잔치, 친척, 친밀도 4, 지방, 참석, 장소 없음
    // 예상 결과: recommended = 50000, min = 40000, max = 70000
    const input: CalcInput = {
      eventType: "doljanchi",
      relation: "relative",
      intimacy: 4,
      region: "region",
      attendance: "attend",
      venue: null,
    };

    const result = safeCalculate(input);
    expect(result).not.toBeNull();
    expect(result!.recommended).toBe(50000);
    expect(result!.rangeMin).toBe(40000);
    expect(result!.rangeMax).toBe(70000);
  });

  it("should calculate consistent results for spec example C", () => {
    // Spec Example C: 생일, 동료, 친밀도 2, 서울, 참석, 장소 없음
    // 예상 결과: recommended = 30000, min = 20000, max = 40000
    const input: CalcInput = {
      eventType: "birthday",
      relation: "colleague",
      intimacy: 2,
      region: "metro",
      attendance: "attend",
      venue: null,
    };

    const result = safeCalculate(input);
    expect(result).not.toBeNull();
    expect(result!.recommended).toBe(30000);
    expect(result!.rangeMin).toBe(20000);
    expect(result!.rangeMax).toBe(40000);
  });

  it("should calculate consistent results for spec example D", () => {
    // Spec Example D: 환갑, 부모, 친밀도 5, 지방, 부주최, 장소 없음
    // 예상 결과: recommended = 200000, min = 150000, max = 250000
    const input: CalcInput = {
      eventType: "hwangap",
      relation: "parent",
      intimacy: 5,
      region: "region",
      attendance: "host",
      venue: null,
    };

    const result = safeCalculate(input);
    expect(result).not.toBeNull();
    expect(result!.recommended).toBe(200000);
    expect(result!.rangeMin).toBe(150000);
    expect(result!.rangeMax).toBe(250000);
  });
});

// =============================================================================
// AC-2: eventType/relation 안전 가드 (undefined/empty/unknown)
// =============================================================================

describe("AC-2: safely handle undefined, empty, or unknown eventType/relation", () => {
  it("should return null when eventType is undefined", () => {
    const input: Partial<CalcInput> = {
      eventType: undefined,
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
    };

    const result = safeCalculate(normalizeCalcInput(input));
    expect(result).toBeNull();
  });

  it("should return null when relation is undefined", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: undefined,
      intimacy: 3,
      region: "metro",
      attendance: "attend",
    };

    const result = safeCalculate(normalizeCalcInput(input));
    expect(result).toBeNull();
  });

  it("should return null when eventType is empty string", () => {
    const input: Partial<CalcInput> = {
      eventType: "",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
    };

    const result = safeCalculate(normalizeCalcInput(input));
    expect(result).toBeNull();
  });

  it("should return null when relation is empty string", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
    };

    const result = safeCalculate(normalizeCalcInput(input));
    expect(result).toBeNull();
  });

  it("should return null when eventType is not in BASE_TABLE", () => {
    const input: Partial<CalcInput> = {
      eventType: "unknown_event_type",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
    };

    const result = safeCalculate(normalizeCalcInput(input));
    expect(result).toBeNull();
  });

  it("should return null when relation is not in BASE_TABLE[eventType]", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "unknown_relation",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
    };

    const result = safeCalculate(normalizeCalcInput(input));
    expect(result).toBeNull();
  });

  it("should not throw exception for invalid inputs - graceful null return", () => {
    const invalidInputs: Partial<CalcInput>[] = [
      { eventType: undefined, relation: undefined },
      { eventType: "", relation: "" },
      { eventType: null as any, relation: "friend" },
      { eventType: "wedding", relation: null as any },
    ];

    invalidInputs.forEach((input) => {
      expect(() => {
        const result = safeCalculate(normalizeCalcInput(input));
        expect(result).toBeNull();
      }).not.toThrow();
    });
  });
});

// =============================================================================
// AC-3: intimacy 정규화 (clamp 1-5, default 3)
// =============================================================================

describe("AC-3: normalize intimacy with clamping and default handling", () => {
  it("should clamp intimacy 0 to 1", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 0,
      region: "metro",
      attendance: "attend",
    };

    const normalized = normalizeCalcInput(input);
    expect(normalized.intimacy).toBe(1);
    expect(() => safeCalculate(normalized)).not.toThrow();
  });

  it("should clamp intimacy 6 to 5", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 6,
      region: "metro",
      attendance: "attend",
    };

    const normalized = normalizeCalcInput(input);
    expect(normalized.intimacy).toBe(5);
    expect(() => safeCalculate(normalized)).not.toThrow();
  });

  it("should clamp intimacy 10 to 5", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 10,
      region: "metro",
      attendance: "attend",
    };

    const normalized = normalizeCalcInput(input);
    expect(normalized.intimacy).toBe(5);
  });

  it("should handle NaN intimacy and default to 3", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "friend",
      intimacy: NaN,
      region: "metro",
      attendance: "attend",
    };

    const normalized = normalizeCalcInput(input);
    expect(normalized.intimacy).toBe(3);
    expect(() => safeCalculate(normalized)).not.toThrow();
  });

  it("should handle undefined intimacy and default to 3", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "friend",
      intimacy: undefined,
      region: "metro",
      attendance: "attend",
    };

    const normalized = normalizeCalcInput(input);
    expect(normalized.intimacy).toBe(3);
    expect(() => safeCalculate(normalized)).not.toThrow();
  });

  it("should preserve valid intimacy values 1-5", () => {
    [1, 2, 3, 4, 5].forEach((value) => {
      const input: Partial<CalcInput> = {
        eventType: "wedding",
        relation: "friend",
        intimacy: value,
        region: "metro",
        attendance: "attend",
      };

      const normalized = normalizeCalcInput(input);
      expect(normalized.intimacy).toBe(value);
    });
  });
});

// =============================================================================
// AC-4: venue 안전 가드 (wedding+attend 아닐 때는 venue 무시)
// =============================================================================

describe("AC-4: venue logic - hotel 30000 only applies for wedding+attend", () => {
  it("should apply hotel venue bonus for wedding+attend with venue", () => {
    const withVenue: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: "hotel",
    };

    const withoutVenue: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: null,
    };

    const resultWith = safeCalculate(withVenue);
    const resultWithout = safeCalculate(withoutVenue);
    expect(resultWith).not.toBeNull();
    expect(resultWithout).not.toBeNull();
    expect(resultWith!.recommended).toBe(resultWithout!.recommended + 30000);
  });

  it("should NOT apply hotel venue bonus for wedding+host (not attend)", () => {
    const hostWithVenue: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "host",
      venue: "hotel",
    };

    const hostWithoutVenue: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "host",
      venue: null,
    };

    const resultWith = safeCalculate(hostWithVenue);
    const resultWithout = safeCalculate(hostWithoutVenue);
    expect(resultWith).not.toBeNull();
    expect(resultWithout).not.toBeNull();
    expect(resultWith!.recommended).toBe(resultWithout!.recommended);
  });

  it("should NOT apply hotel venue bonus for non-wedding+attend", () => {
    const birthdayAttendWithVenue: CalcInput = {
      eventType: "birthday",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: "hotel",
    };

    const birthdayAttendWithoutVenue: CalcInput = {
      eventType: "birthday",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: null,
    };

    const resultWith = safeCalculate(birthdayAttendWithVenue);
    const resultWithout = safeCalculate(birthdayAttendWithoutVenue);
    expect(resultWith).not.toBeNull();
    expect(resultWithout).not.toBeNull();
    expect(resultWith!.recommended).toBe(resultWithout!.recommended);
  });

  it("should NOT apply hotel venue bonus for a non-hotel venue value", () => {
    const generalVenue: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: "general",
    };

    const noVenue: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: null,
    };

    const resultGeneral = safeCalculate(generalVenue);
    const resultNone = safeCalculate(noVenue);
    expect(resultGeneral).not.toBeNull();
    expect(resultNone).not.toBeNull();
    expect(resultGeneral!.recommended).toBe(resultNone!.recommended);
  });

  it("should normalize venue to null when conditions not met", () => {
    const inputs: Partial<CalcInput>[] = [
      {
        eventType: "birthday",
        relation: "friend",
        intimacy: 3,
        region: "metro",
        attendance: "attend",
        venue: "hotel",
      },
      {
        eventType: "wedding",
        relation: "friend",
        intimacy: 3,
        region: "metro",
        attendance: "host",
        venue: "hotel",
      },
    ];

    inputs.forEach((input) => {
      const normalized = normalizeCalcInput(input);
      expect(normalized.venue).toBeNull();
    });
  });
});

// =============================================================================
// AC-5: No direct .length access on potentially undefined arrays
// =============================================================================

describe("AC-5: no unsafe .length access on arrays", () => {
  it("should safely compute rangeMin/rangeMax without index bounds errors", () => {
    // When snapToLadder returns idx=0, rangeMin should use recommended fallback (not idx-1)
    const input: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 1,
      region: "metro",
      attendance: "attend",
      venue: null,
    };
    const result = safeCalculate(input);
    expect(result).not.toBeNull();
    expect(result!.rangeMin).toBeDefined();
    expect(result!.rangeMax).toBeDefined();
  });

  it("should not crash when LADDER is at boundary indices", () => {
    // At idx=0 (minimum): rangeMin = recommended, range not negative
    // At idx=LADDER.length-1 (maximum): rangeMax = recommended
    const inputs: Partial<CalcInput>[] = [
      {
        eventType: "wedding",
        relation: "friend",
        intimacy: 1,
        region: "metro",
        attendance: "attend",
      },
      {
        eventType: "wedding",
        relation: "friend",
        intimacy: 5,
        region: "metro",
        attendance: "attend",
      },
    ];
    inputs.forEach((input) => {
      expect(() => {
        const normalized = normalizeCalcInput(input);
        const result = safeCalculate(normalized);
        expect(result).not.toBeNull();
      }).not.toThrow();
    });
  });
});

// =============================================================================
// Additional Integration Tests
// =============================================================================

describe("normalizeCalcInput - default values and composition", () => {
  it("should apply all defaults: intimacy=3, region=metro, attendance=attend, venue=null", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "friend",
    };

    const normalized = normalizeCalcInput(input);
    expect(normalized.intimacy).toBe(3);
    expect(normalized.region).toBe("metro");
    expect(normalized.attendance).toBe("attend");
    expect(normalized.venue).toBeNull();
  });

  it("should preserve explicit values and only fill missing fields", () => {
    const input: Partial<CalcInput> = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 5,
      region: "region",
      attendance: "host",
      venue: "hotel",
    };

    const normalized = normalizeCalcInput(input);
    expect(normalized.eventType).toBe("wedding");
    expect(normalized.relation).toBe("friend");
    expect(normalized.intimacy).toBe(5);
    expect(normalized.region).toBe("region");
    expect(normalized.attendance).toBe("host");
    // venue is only preserved when eligible (wedding + attend); "host" clears it
    expect(normalized.venue).toBeNull();
  });
});

describe("safeCalculate - comprehensive end-to-end", () => {
  it("should return valid CalcResult for valid input (happy path)", () => {
    const input: CalcInput = {
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: null,
    };

    const result = safeCalculate(input);
    expect(result).not.toBeNull();
    if (result) {
      expect(typeof result.recommended).toBe("number");
      expect(typeof result.rangeMin).toBe("number");
      expect(typeof result.rangeMax).toBe("number");
      expect(result.rangeMin <= result.recommended).toBe(true);
      expect(result.recommended <= result.rangeMax).toBe(true);
    }
  });

  it("should return null for invalid input (error path)", () => {
    const input: Partial<CalcInput> = {
      eventType: "unknown",
      relation: "unknown",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
    };

    const result = safeCalculate(normalizeCalcInput(input));
    expect(result).toBeNull();
  });

  it("should not resolve to a base amount via inherited Object.prototype keys", () => {
    const result = safeCalculate({ eventType: "constructor", relation: "toString" });
    expect(result).toBeNull();
  });
});
