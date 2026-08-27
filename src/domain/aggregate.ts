import type { HistoryRecord } from "@/lib/types";

/**
 * F6: 통계 집계 함수
 * 히스토리 레코드 배열을 받아 총액/건수/유형별 합계/월별 추이를 반환하는 순수 함수.
 * 내부에서 임의성(random) 호출 금지. 결정론적 계산만.
 *
 * @param records - 히스토리 레코드 배열
 * @returns 집계 결과
 *   - totalCount: 총 건수
 *   - totalAmount: 총 지출액 (원)
 *   - avgAmount: 건당 평균 (원 단위 올림)
 *   - byEventType: 유형별 합계 { eventType: { count, sum } }
 *   - monthly: 월별 추이 배열 [ { ym: 'YYYY-MM', sum } ] (ym 오름차순)
 */
export interface AggregateResult {
  totalCount: number;
  totalAmount: number;
  avgAmount: number;
  byEventType: Record<string, { count: number; sum: number }>;
  monthly: Array<{ ym: string; sum: number }>;
}

export function aggregate(records: HistoryRecord[]): AggregateResult {
  const totalCount = records.length;
  let totalAmount = 0;
  const byEventType: Record<string, { count: number; sum: number }> = {};
  const monthlyMap: Record<string, number> = {};

  for (const record of records) {
    totalAmount += record.amount;

    const eventBucket = byEventType[record.eventType] ?? { count: 0, sum: 0 };
    eventBucket.count += 1;
    eventBucket.sum += record.amount;
    byEventType[record.eventType] = eventBucket;

    const ym = record.eventDate.slice(0, 7);
    monthlyMap[ym] = (monthlyMap[ym] ?? 0) + record.amount;
  }

  const avgAmount = totalCount === 0 ? 0 : Math.ceil(totalAmount / totalCount);
  const monthly = Object.keys(monthlyMap)
    .sort()
    .map((ym) => ({ ym, sum: monthlyMap[ym] }));

  return {
    totalCount,
    totalAmount,
    avgAmount,
    byEventType,
    monthly,
  };
}

export type { HistoryRecord };
