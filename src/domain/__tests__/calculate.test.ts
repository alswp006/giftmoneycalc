import { describe, it, expect } from "vitest";
import { calculate } from "@/domain/calculate";
import { aggregate } from "@/domain/aggregate";
import type { HistoryRecord } from "@/domain/types";

describe("calculate", () => {
  it("골든 케이스: 결혼/친구/미참석/0 → 50,000", () => {
    const result = calculate({
      eventType: "WEDDING",
      relation: "FRIEND",
      attended: false,
      companions: 0,
      eventDate: "2026-08-28",
    });
    expect(result.recommended).toBe(50_000);
    expect(result.breakdown.clamped).toBe(false);
  });

  it("골든 케이스: 개업/가족/참석/2 → 260,000", () => {
    const result = calculate({
      eventType: "OPENING",
      relation: "FAMILY",
      attended: true,
      companions: 2,
      eventDate: "2026-08-28",
    });
    expect(result.recommended).toBe(260_000);
  });

  it("companions가 10이면 RangeError('companions')를 던진다", () => {
    expect(() =>
      calculate({
        eventType: "WEDDING",
        relation: "FRIEND",
        attended: true,
        companions: 10,
        eventDate: "2026-08-28",
      }),
    ).toThrow(/companions/);
  });

  it("eventType이 유효하지 않으면 TypeError(입력값 원문 포함)를 던진다", () => {
    expect(() =>
      calculate({
        eventType: "PARTY" as never,
        relation: "FRIEND",
        attended: true,
        companions: 0,
        eventDate: "2026-08-28",
      }),
    ).toThrow(/PARTY/);
  });

  it("동일 입력을 100회 호출해도 결과가 모두 동일하다", () => {
    const input = {
      eventType: "WEDDING" as const,
      relation: "FRIEND" as const,
      attended: true,
      companions: 1,
      eventDate: "2026-08-28",
    };
    const outputs = Array.from({ length: 100 }, () => JSON.stringify(calculate(input)));
    expect(new Set(outputs).size).toBe(1);
  });
});

describe("aggregate", () => {
  it("빈 배열이면 예외 없이 기본 형태를 반환한다", () => {
    const result = aggregate([]);
    expect(result).toEqual({ totalCount: 0, totalAmount: 0, avgAmount: 0, byEventType: {}, monthly: [] });
  });

  it("총액/건수/유형별 합계/월별 추이를 집계한다", () => {
    const records: HistoryRecord[] = [
      {
        id: "1",
        eventType: "WEDDING",
        relation: "FRIEND",
        amount: 50_000,
        recommendedAmount: 50_000,
        attended: true,
        companions: 0,
        eventDate: "2026-01-15",
        ruleVersion: 1,
        createdAt: "2026-01-15T00:00:00.000Z",
        updatedAt: "2026-01-15T00:00:00.000Z",
      },
      {
        id: "2",
        eventType: "FUNERAL",
        relation: "RELATIVE",
        amount: 100_000,
        recommendedAmount: 100_000,
        attended: false,
        companions: 0,
        eventDate: "2026-02-01",
        ruleVersion: 1,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ];

    const result = aggregate(records);
    expect(result.totalCount).toBe(2);
    expect(result.totalAmount).toBe(150_000);
    expect(result.byEventType.WEDDING).toEqual({ count: 1, sum: 50_000 });
    expect(result.byEventType.FUNERAL).toEqual({ count: 1, sum: 100_000 });
    expect(result.monthly).toEqual([
      { ym: "2026-01", sum: 50_000 },
      { ym: "2026-02", sum: 100_000 },
    ]);
  });
});
