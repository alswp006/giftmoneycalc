import {
  ATTENDANCE_FACTOR,
  ATTENDANCE_LABEL,
  AMOUNT_LADDER,
  EVENT_BASE,
  INTIMACY_FACTOR,
  INTIMACY_LABEL,
  REGION_FACTOR,
  REGION_SHORT_LABEL,
  RELATION_FACTOR,
  RELATION_LABEL,
} from "@/lib/constants";
import { formatKRW } from "@/lib/format";
import type { BreakdownItem, CalcInput, CalcResult } from "@/lib/types";

function snapToLadder(rawAmount: number): number {
  let closest = AMOUNT_LADDER[0];
  let closestDistance = Math.abs(rawAmount - closest);

  for (const value of AMOUNT_LADDER) {
    const distance = Math.abs(rawAmount - value);
    if (distance < closestDistance) {
      closest = value;
      closestDistance = distance;
    }
  }

  return closest;
}

export function calcGiftAmount(input: CalcInput): CalcResult {
  const { eventType, relation, intimacy, attendance, region } = input;

  const baseAmount = EVENT_BASE[eventType];
  const rawAmount = Math.round(
    baseAmount *
      RELATION_FACTOR[relation] *
      INTIMACY_FACTOR[intimacy] *
      ATTENDANCE_FACTOR[attendance] *
      REGION_FACTOR[region],
  );

  const recommended = snapToLadder(rawAmount);
  const index = AMOUNT_LADDER.indexOf(recommended);
  const min = AMOUNT_LADDER[index - 1] ?? AMOUNT_LADDER[0];
  const max = AMOUNT_LADDER[index + 1] ?? AMOUNT_LADDER[index];

  const breakdown: BreakdownItem[] = [
    { label: "기본 금액 " + formatKRW(baseAmount), factor: 1.0 },
    { label: "관계: " + RELATION_LABEL[relation], factor: RELATION_FACTOR[relation] },
    { label: "친밀도: " + INTIMACY_LABEL[intimacy], factor: INTIMACY_FACTOR[intimacy] },
    { label: "참석: " + ATTENDANCE_LABEL[attendance], factor: ATTENDANCE_FACTOR[attendance] },
    { label: "지역: " + REGION_SHORT_LABEL[region], factor: REGION_FACTOR[region] },
  ];

  return {
    recommended,
    min,
    max,
    rawAmount,
    breakdown,
    input,
  };
}
