import type { EventType, Relation } from "@/domain/types";

export const BASE_AMOUNT: Record<EventType, number> = Object.freeze({
  WEDDING: 50000,
  FUNERAL: 50000,
  FIRST_BIRTHDAY: 30000,
  OPENING: 50000,
});

export const RELATION_MULTIPLIER: Record<Relation, number> = Object.freeze({
  FAMILY: 4.0,
  RELATIVE: 2.0,
  CLOSE_FRIEND: 2.0,
  FRIEND: 1.0,
  COWORKER: 1.0,
  ACQUAINTANCE: 0.6,
});

export const MEAL_COST: Record<EventType, number> = Object.freeze({
  WEDDING: 30000,
  FUNERAL: 20000,
  FIRST_BIRTHDAY: 30000,
  OPENING: 20000,
});

export const MIN_AMOUNT = 30000 as const;
export const MAX_AMOUNT = 1000000 as const;
export const RULE_VERSION = 1 as const;
