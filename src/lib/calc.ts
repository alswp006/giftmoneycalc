import type { CalcInput, CalcResult } from "@/lib/types";
import {
  ABSENT_MULTIPLIER,
  ATTEND_MULTIPLIER,
  BASE_AMOUNT_TABLE,
  EVENT_TYPE_LABEL,
  INFLATION_MULTIPLIER,
  NO_INFLATION_MULTIPLIER,
  RANGE_MAX_RATIO,
  RANGE_MIN_RATIO,
  REGION_LABEL,
  REGION_MULTIPLIER,
  RELATIONSHIP_LABEL,
  ROUND_UNIT,
} from "@/lib/rules";

function roundToUnit(amount: number, unit: number): number {
  return Math.round(amount / unit) * unit;
}

function floorToUnit(amount: number, unit: number): number {
  return Math.floor(amount / unit) * unit;
}

function ceilToUnit(amount: number, unit: number): number {
  return Math.ceil(amount / unit) * unit;
}

export function calculate(input: CalcInput): CalcResult {
  const { eventType, relationship, region, attend, inflationAdjust } = input;

  const baseAmount = BASE_AMOUNT_TABLE[eventType][relationship];
  const attendMultiplier = attend ? ATTEND_MULTIPLIER : ABSENT_MULTIPLIER;
  const regionMultiplier = REGION_MULTIPLIER[region];
  const inflationMultiplier = inflationAdjust ? INFLATION_MULTIPLIER : NO_INFLATION_MULTIPLIER;

  const adjustedAmount = baseAmount * attendMultiplier * regionMultiplier * inflationMultiplier;
  const recommendedAmount = Math.max(ROUND_UNIT, roundToUnit(adjustedAmount, ROUND_UNIT));

  const rangeMin = Math.max(ROUND_UNIT, floorToUnit(recommendedAmount * RANGE_MIN_RATIO, ROUND_UNIT));
  const rangeMax = Math.max(recommendedAmount, ceilToUnit(recommendedAmount * RANGE_MAX_RATIO, ROUND_UNIT));

  const reasons: string[] = [
    `${EVENT_TYPE_LABEL[eventType]} · ${RELATIONSHIP_LABEL[relationship]} 기준 금액은 ${baseAmount.toLocaleString()}원이에요`,
    attend
      ? "참석하는 경우라 식사비를 포함해 산정했어요"
      : "불참하는 경우라 기준 금액보다 낮게 산정했어요",
    `${REGION_LABEL[region]} 지역 물가를 반영했어요`,
  ];

  if (inflationAdjust) {
    reasons.push("최근 물가 상승분을 반영해 금액을 올렸어요");
  }

  return {
    recommendedAmount,
    rangeMin,
    rangeMax,
    reasons,
  };
}
