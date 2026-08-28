import type { GiftRecord, StatsSummary } from "@/lib/types";

const MONTHLY_TREND_MONTHS = 6;

function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function aggregate(records: GiftRecord[], _now: number): StatsSummary {
  const count = records.length;
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const avgAmount = count === 0 ? 0 : totalAmount / count;

  const byEventTypeMap = new Map<string, number>();
  for (const r of records) {
    byEventTypeMap.set(r.eventType, (byEventTypeMap.get(r.eventType) ?? 0) + r.amount);
  }
  const byEventType = Array.from(byEventTypeMap.entries()).map(([type, amount]) => ({
    type: type as GiftRecord["eventType"],
    amount,
    ratio: totalAmount === 0 ? 0 : amount / totalAmount,
  }));

  const monthlyMap = new Map<string, number>();
  for (const r of records) {
    const month = monthOf(r.eventDate);
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + r.amount);
  }
  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-MONTHLY_TREND_MONTHS);

  const relationshipCounts = new Map<string, number>();
  for (const r of records) {
    relationshipCounts.set(r.relationship, (relationshipCounts.get(r.relationship) ?? 0) + 1);
  }
  let topRelationship: GiftRecord["relationship"] | null = null;
  let topCount = 0;
  for (const [relationship, relCount] of relationshipCounts) {
    if (relCount > topCount) {
      topCount = relCount;
      topRelationship = relationship as GiftRecord["relationship"];
    }
  }

  return {
    totalAmount,
    count,
    avgAmount,
    byEventType,
    monthlyTrend,
    topRelationship,
  };
}
