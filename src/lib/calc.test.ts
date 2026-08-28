import { describe, it, expect } from "vitest";
import { calculate } from "@/lib/calc";
import type { EventType, Relationship } from "@/lib/types";

// 행사유형 4종 × 관계 9등급 전체 테이블 — 서울 · 참석 · 물가보정 없음 기준 명시 기대값
const EXPECTED_RECOMMENDED_AMOUNT: Record<EventType, Record<Relationship, number>> = {
  wedding: {
    parents: 550000,
    siblings: 330000,
    spouse: 1100000,
    children: 550000,
    relatives: 110000,
    friends: 110000,
    colleagues: 60000,
    boss: 110000,
    acquaintance: 60000,
  },
  funeral: {
    parents: 550000,
    siblings: 330000,
    spouse: 1100000,
    children: 330000,
    relatives: 110000,
    friends: 110000,
    colleagues: 60000,
    boss: 110000,
    acquaintance: 30000,
  },
  firstBirthday: {
    parents: 330000,
    siblings: 220000,
    spouse: 330000,
    children: 220000,
    relatives: 110000,
    friends: 110000,
    colleagues: 60000,
    boss: 110000,
    acquaintance: 60000,
  },
  etc: {
    parents: 220000,
    siblings: 170000,
    spouse: 220000,
    children: 170000,
    relatives: 110000,
    friends: 60000,
    colleagues: 30000,
    boss: 60000,
    acquaintance: 30000,
  },
};

describe("calculate — 행사유형 × 관계 테이블 (명시 기대값)", () => {
  (Object.keys(EXPECTED_RECOMMENDED_AMOUNT) as EventType[]).forEach((eventType) => {
    (Object.keys(EXPECTED_RECOMMENDED_AMOUNT[eventType]) as Relationship[]).forEach((relationship) => {
      const expected = EXPECTED_RECOMMENDED_AMOUNT[eventType][relationship];

      it(`${eventType} + ${relationship} → ${expected.toLocaleString()}원`, () => {
        const result = calculate({
          eventType,
          relationship,
          region: "seoul",
          attend: true,
          inflationAdjust: false,
        });

        expect(result.recommendedAmount).toBe(expected);
      });
    });
  });
});

describe("calculate — 범위 계산", () => {
  it("추천 금액의 80%를 절사한 값이 rangeMin이다", () => {
    const result = calculate({
      eventType: "wedding",
      relationship: "parents",
      region: "seoul",
      attend: true,
      inflationAdjust: false,
    });

    // recommendedAmount=550000 → 550000*0.8=440000 (10,000원 단위 절사 그대로)
    expect(result.rangeMin).toBe(440000);
  });

  it("추천 금액의 120%를 올림한 값이 rangeMax다", () => {
    const result = calculate({
      eventType: "wedding",
      relationship: "parents",
      region: "seoul",
      attend: true,
      inflationAdjust: false,
    });

    // recommendedAmount=550000 → 550000*1.2=660000 (10,000원 단위 올림 그대로)
    expect(result.rangeMax).toBe(660000);
  });
});

describe("calculate — 불참/물가보정 배수", () => {
  it("불참 시 참석보다 낮은 금액을 산정한다", () => {
    const attend = calculate({
      eventType: "wedding",
      relationship: "friends",
      region: "seoul",
      attend: true,
      inflationAdjust: false,
    });
    const absent = calculate({
      eventType: "wedding",
      relationship: "friends",
      region: "seoul",
      attend: false,
      inflationAdjust: false,
    });

    expect(absent.recommendedAmount).toBeLessThan(attend.recommendedAmount);
  });

  it("물가보정 반영 시 미반영보다 높은 금액을 산정한다", () => {
    const base = calculate({
      eventType: "wedding",
      relationship: "friends",
      region: "seoul",
      attend: true,
      inflationAdjust: false,
    });
    const adjusted = calculate({
      eventType: "wedding",
      relationship: "friends",
      region: "seoul",
      attend: true,
      inflationAdjust: true,
    });

    expect(adjusted.recommendedAmount).toBeGreaterThan(base.recommendedAmount);
  });
});
