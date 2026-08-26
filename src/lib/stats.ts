import type { EventType, GiftRecord } from "@/lib/types";

export interface GiftStats {
  totalGiven: number;
  totalReceived: number;
  count: number;
  averageAmount: number;
  byEventType: Record<EventType, number>;
  byMonth: Record<string, number>;
}

const EMPTY_BY_EVENT_TYPE: Record<EventType, number> = {
  wedding: 0,
  funeral: 0,
  firstBirthday: 0,
  opening: 0,
};

/**
 * GiftRecord 배열을 요약 통계로 집계한다 (순수 함수, 스토리지 접근 없음).
 * 빈 배열은 0/빈 객체로 안전하게 반환한다.
 */
export function aggregateStats(records: GiftRecord[]): GiftStats {
  const byEventType: Record<EventType, number> = { ...EMPTY_BY_EVENT_TYPE };
  const byMonth: Record<string, number> = {};

  let totalGiven = 0;
  let totalReceived = 0;
  let totalAmount = 0;

  for (const record of records) {
    totalAmount += record.amount;

    if (record.direction === "given") {
      totalGiven += record.amount;
    } else {
      totalReceived += record.amount;
    }

    byEventType[record.eventType] += record.amount;

    const month = record.date.slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + record.amount;
  }

  return {
    totalGiven,
    totalReceived,
    count: records.length,
    averageAmount: records.length > 0 ? totalAmount / records.length : 0,
    byEventType,
    byMonth,
  };
}
