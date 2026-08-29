// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { normalizeCalcInput, safeCalculate, snapToLadder } from "../calc";
import { getHistoryList, HISTORY_STORAGE_KEY } from "../storage";
import {
  DEFAULT_ATTENDANCE,
  DEFAULT_INTIMACY,
  DEFAULT_REGION,
  LADDER,
  MAX_INTIMACY,
  MIN_INTIMACY,
} from "../constants";

/**
 * 에러 경로 회귀 테스트 — 파이프라인을 크래시시켰던 입력들을 고정한다.
 * 정상 A~D 케이스를 같은 파일에 두어, 방어 코드가 정상 계산을 바꾸지 않았음을 함께 보장한다.
 */

describe("normalizeCalcInput — undefined·부분 입력·미지 enum", () => {
  it("null/undefined 입력에도 예외 없이 기본값 세트를 돌려준다", () => {
    expect(() => normalizeCalcInput(undefined)).not.toThrow();
    expect(() => normalizeCalcInput(null)).not.toThrow();

    expect(normalizeCalcInput(undefined)).toEqual({
      eventType: "",
      relation: "",
      intimacy: DEFAULT_INTIMACY,
      region: DEFAULT_REGION,
      attendance: DEFAULT_ATTENDANCE,
      venue: null,
    });
  });

  it("일부 필드만 있는 입력은 나머지를 기본값으로 채운다", () => {
    const normalized = normalizeCalcInput({ eventType: "wedding" });

    expect(normalized.eventType).toBe("wedding");
    expect(normalized.relation).toBe("");
    expect(normalized.region).toBe(DEFAULT_REGION);
    expect(normalized.attendance).toBe(DEFAULT_ATTENDANCE);
    expect(normalized.intimacy).toBe(DEFAULT_INTIMACY);
  });

  it("빈 문자열 region/attendance는 기본값으로 되돌린다", () => {
    const normalized = normalizeCalcInput({ region: "", attendance: "" });

    expect(normalized.region).toBe(DEFAULT_REGION);
    expect(normalized.attendance).toBe(DEFAULT_ATTENDANCE);
  });

  it("미지의 enum 값은 그대로 보존하되 계산은 null로 떨어진다", () => {
    const normalized = normalizeCalcInput({
      eventType: "unknown_event",
      relation: "unknown_relation",
      region: "mars",
      attendance: "maybe",
    });

    expect(normalized.eventType).toBe("unknown_event");
    expect(normalized.region).toBe("mars");
    expect(safeCalculate(normalized)).toBeNull();
  });

  it("숫자가 아닌 intimacy(NaN·Infinity·문자열·null)는 기본값 3이 된다", () => {
    const badValues = [NaN, Infinity, -Infinity, "3", null, undefined, {}];

    badValues.forEach((value) => {
      const normalized = normalizeCalcInput({ intimacy: value as number });
      expect(normalized.intimacy).toBe(DEFAULT_INTIMACY);
    });
  });

  it("범위를 벗어난 intimacy는 1~5로 잘린다", () => {
    expect(normalizeCalcInput({ intimacy: 0 }).intimacy).toBe(MIN_INTIMACY);
    expect(normalizeCalcInput({ intimacy: -7 }).intimacy).toBe(MIN_INTIMACY);
    expect(normalizeCalcInput({ intimacy: 99 }).intimacy).toBe(MAX_INTIMACY);
  });

  it("결혼식·참석이 아닌 경우 venue는 무시하고 null로 만든다", () => {
    expect(normalizeCalcInput({ eventType: "wedding", attendance: "absent", venue: "hotel" }).venue).toBeNull();
    expect(normalizeCalcInput({ eventType: "doljanchi", attendance: "attend", venue: "hotel" }).venue).toBeNull();
    expect(normalizeCalcInput({ eventType: "wedding", attendance: "attend", venue: "hotel" }).venue).toBe("hotel");
  });
});

describe("snapToLadder — 경계값과 잘못된 숫자", () => {
  it("NaN·undefined·null이면 사다리 최솟값을 돌려준다", () => {
    expect(() => snapToLadder(NaN)).not.toThrow();
    expect(snapToLadder(NaN)).toBe(LADDER[0]);
    expect(snapToLadder(undefined as unknown as number)).toBe(LADDER[0]);
    expect(snapToLadder(null as unknown as number)).toBe(LADDER[0]);
  });

  it("음수·0은 최솟값, 사다리 최댓값을 넘는 값은 최댓값으로 붙는다", () => {
    expect(snapToLadder(-50000)).toBe(LADDER[0]);
    expect(snapToLadder(0)).toBe(LADDER[0]);
    expect(snapToLadder(99_000_000)).toBe(LADDER[LADDER.length - 1]);
  });

  it("사다리 사이 값은 가장 가까운 단위로 붙는다", () => {
    expect(snapToLadder(56000)).toBe(50000);
    expect(snapToLadder(64000)).toBe(70000);
    expect(snapToLadder(100000)).toBe(100000);
  });
});

describe("safeCalculate — 크래시 대신 null", () => {
  it("undefined·빈 객체·미지 조합은 예외 없이 null이다", () => {
    expect(() => safeCalculate(undefined as never)).not.toThrow();
    expect(safeCalculate(undefined as never)).toBeNull();
    expect(safeCalculate({})).toBeNull();
    expect(safeCalculate({ eventType: "wedding" })).toBeNull();
    expect(safeCalculate({ relation: "friend" })).toBeNull();
    expect(safeCalculate({ eventType: "unknown_event", relation: "friend" })).toBeNull();
    expect(safeCalculate({ eventType: "wedding", relation: "unknown_relation" })).toBeNull();
  });

  it("NaN intimacy여도 기본값으로 계산이 끝까지 진행된다", () => {
    const result = safeCalculate({ eventType: "wedding", relation: "friend", intimacy: NaN });

    expect(result).not.toBeNull();
    expect(result?.recommended).toBe(70000);
  });

  it("결과의 range는 항상 recommended를 감싸고 사다리 위의 값이다", () => {
    const result = safeCalculate({ eventType: "wedding", relation: "parent" });

    expect(result).not.toBeNull();
    expect(result!.rangeMin).toBeLessThanOrEqual(result!.recommended);
    expect(result!.rangeMax).toBeGreaterThanOrEqual(result!.recommended);
    expect(LADDER).toContain(result!.recommended);
    expect(LADDER).toContain(result!.rangeMin);
    expect(LADDER).toContain(result!.rangeMax);
  });
});

describe("safeCalculate — SPEC 정상 케이스 A~D", () => {
  it("A: 결혼식·친구·호텔 참석 → 10만 원", () => {
    expect(
      safeCalculate({
        eventType: "wedding",
        relation: "friend",
        intimacy: 3,
        region: "metro",
        attendance: "attend",
        venue: "hotel",
      })
    ).toEqual({ recommended: 100000, rangeMin: 80000, rangeMax: 120000 });
  });

  it("B: 돌잔치·친척 → 5만 원", () => {
    expect(
      safeCalculate({
        eventType: "doljanchi",
        relation: "relative",
        intimacy: 4,
        region: "region",
        attendance: "attend",
        venue: null,
      })
    ).toEqual({ recommended: 50000, rangeMin: 40000, rangeMax: 70000 });
  });

  it("C: 생일·직장 동료 → 3만 원", () => {
    expect(
      safeCalculate({
        eventType: "birthday",
        relation: "colleague",
        intimacy: 2,
        region: "metro",
        attendance: "attend",
        venue: null,
      })
    ).toEqual({ recommended: 30000, rangeMin: 20000, rangeMax: 40000 });
  });

  it("D: 환갑·부모님·주최 측 → 20만 원", () => {
    expect(
      safeCalculate({
        eventType: "hwangap",
        relation: "parent",
        intimacy: 5,
        region: "region",
        attendance: "host",
        venue: null,
      })
    ).toEqual({ recommended: 200000, rangeMin: 150000, rangeMax: 250000 });
  });
});

describe("getHistoryList — 빈/손상 localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("저장값이 없으면 빈 배열이다", () => {
    expect(getHistoryList()).toEqual([]);
  });

  it("손상 JSON·비배열·빈 문자열이어도 예외 없이 빈 배열로 폴백한다", () => {
    const corrupted = ["{not-json", "", "null", "42", JSON.stringify({ recommended: 50000 })];

    corrupted.forEach((raw) => {
      localStorage.setItem(HISTORY_STORAGE_KEY, raw);
      expect(() => getHistoryList()).not.toThrow();
      expect(getHistoryList()).toEqual([]);
    });
  });

  it("배열 안에 깨진 항목이 섞여 있으면 정상 항목만 남긴다", () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        { recommended: 50000, rangeMin: 40000, rangeMax: 70000, createdAt: 1690000000000 },
        null,
        "문자열",
        { recommended: "5만원" },
      ])
    );

    const list = getHistoryList();

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ recommended: 50000, createdAt: 1690000000000 });
  });

  it("createdAt이 없는 옛 기록도 0으로 채워 목록을 살린다", () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([{ recommended: 70000, rangeMin: 50000, rangeMax: 80000 }])
    );

    expect(getHistoryList()[0]).toMatchObject({ recommended: 70000, createdAt: 0 });
  });
});
