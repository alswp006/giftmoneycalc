import { BASE_AMOUNT, RELATION_MULTIPLIER, MEAL_COST, MIN_AMOUNT, MAX_AMOUNT, RULE_VERSION } from "@/domain/rules";
import { EVENT_TYPES, RELATIONS } from "@/domain/types";
import type { CalculationInput, CalculationResult, EventType, Relation } from "@/lib/types";

/**
 * F2: 계산 엔진
 * SPEC §1.5 공식을 구현하는 순수 함수.
 * 비결정적 시각/난수/암호 API 호출 금지 — 순수 함수로만 계산한다.
 *
 * 공식:
 * raw = BASE_AMOUNT[eventType] * RELATION_MULTIPLIER[relation]
 *     + (attended ? MEAL_COST[eventType] * (1 + companions) : 0)
 * snapped = ceil(raw / 10_000) * 10_000
 * result = clamp(snapped, 30_000, 1_000_000)
 *
 * @throws {TypeError} eventType 또는 relation이 유효하지 않으면
 * @throws {RangeError} companions가 비정수/음수/9초과이면
 */
export function calculate(input: CalculationInput): CalculationResult {
  const { eventType, relation, attended, companions } = input;

  if (!EVENT_TYPES.includes(eventType as EventType)) {
    throw new TypeError(`유효하지 않은 eventType입니다: ${String(eventType)}`);
  }
  if (!RELATIONS.includes(relation as Relation)) {
    throw new TypeError(`유효하지 않은 relation입니다: ${String(relation)}`);
  }
  if (!Number.isInteger(companions) || companions < 0 || companions > 9) {
    throw new RangeError(`companions는 0 이상 9 이하의 정수여야 합니다: ${String(companions)}`);
  }

  const base = BASE_AMOUNT[eventType];
  const relationMultiplier = RELATION_MULTIPLIER[relation];
  const effectiveCompanions = attended ? companions : 0;
  const mealCost = attended ? MEAL_COST[eventType] * (1 + effectiveCompanions) : 0;
  const subtotal = base * relationMultiplier + mealCost;
  const rounded = Math.ceil(subtotal / 10_000) * 10_000;
  const clamped = rounded < MIN_AMOUNT || rounded > MAX_AMOUNT;
  const recommended = Math.min(Math.max(rounded, MIN_AMOUNT), MAX_AMOUNT);

  return {
    recommended,
    breakdown: {
      base,
      relationMultiplier,
      mealCost,
      companions: effectiveCompanions,
      subtotal,
      rounded,
      clamped,
    },
    ruleVersion: RULE_VERSION,
  };
}

export type { CalculationInput, CalculationResult };
