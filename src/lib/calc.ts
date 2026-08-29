import type { CalcInput, CalcResult } from "../types/calc";
import {
  BASE_TABLE,
  LADDER,
  HOTEL_VENUE_BONUS,
  DEFAULT_INTIMACY,
  DEFAULT_REGION,
  DEFAULT_ATTENDANCE,
  MIN_INTIMACY,
  MAX_INTIMACY,
} from "./constants";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCalcInput(partial: Partial<CalcInput> | null | undefined): CalcInput {
  const eventType = typeof partial?.eventType === "string" ? partial.eventType : "";
  const relation = typeof partial?.relation === "string" ? partial.relation : "";

  const region =
    typeof partial?.region === "string" && partial.region !== "" ? partial.region : DEFAULT_REGION;
  const attendance =
    typeof partial?.attendance === "string" && partial.attendance !== ""
      ? partial.attendance
      : DEFAULT_ATTENDANCE;

  const rawIntimacy = partial?.intimacy;
  const intimacy = Number.isFinite(rawIntimacy)
    ? clamp(rawIntimacy as number, MIN_INTIMACY, MAX_INTIMACY)
    : DEFAULT_INTIMACY;

  const venueEligible = eventType === "wedding" && attendance === "attend";
  const venue = venueEligible ? partial?.venue ?? null : null;

  return { eventType, relation, intimacy, region, attendance, venue };
}

function snapToLadderIndex(raw: number): number {
  if (!Number.isFinite(raw)) return 0;

  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < LADDER.length; i++) {
    const diff = Math.abs(LADDER[i] - raw);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function snapToLadder(raw: number): number {
  return LADDER[snapToLadderIndex(raw)] ?? LADDER[0];
}

export function safeCalculate(partial: Partial<CalcInput>): CalcResult | null {
  const input = normalizeCalcInput(partial);

  const row = BASE_TABLE[input.eventType];
  if (!row) return null;
  const base = row[input.relation];
  if (base == null) return null;

  const venueEligible = input.eventType === "wedding" && input.attendance === "attend" && !!input.venue;
  const adjusted = venueEligible ? base + HOTEL_VENUE_BONUS : base;

  const idx = snapToLadderIndex(adjusted);
  const recommended = LADDER[idx];
  const rangeMin = idx - 1 >= 0 ? LADDER[idx - 1] : recommended;
  const rangeMax = idx + 1 < LADDER.length ? LADDER[idx + 1] : recommended;

  return { recommended, rangeMin, rangeMax };
}
