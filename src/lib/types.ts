// Domain types — GiftMoneyCalc

export type EventType = "wedding" | "funeral" | "firstBirthday" | "opening";

export type RelationType =
  | "family"
  | "closeFriend"
  | "friend"
  | "coworker"
  | "boss"
  | "acquaintance";

export type RegionType = "seoulGangnam" | "metropolitan" | "majorCity" | "other";

export type Attendance = "attending" | "absent";

export type Intimacy = 1 | 2 | 3 | 4 | 5;

export type Direction = "given" | "received";

export interface CalcInput {
  eventType: EventType;
  relation: RelationType;
  intimacy: Intimacy;
  attendance: Attendance;
  region: RegionType;
}

export interface BreakdownItem {
  label: string;
  factor: number;
}

export interface CalcResult {
  recommended: number;
  min: number;
  max: number;
  rawAmount: number;
  breakdown: BreakdownItem[];
  input: CalcInput;
}

export interface GiftRecord {
  id: string;
  personName: string;
  eventType: EventType;
  relation: RelationType;
  amount: number;
  date: string;
  direction: Direction;
  memo: string;
  createdAt: number;
}

export interface Settings {
  defaultRegion: RegionType;
  onboardingDone: boolean;
  compactList: boolean;
}

export interface LastCalc {
  input: CalcInput;
  result: CalcResult;
  at: number;
}

export interface RewardUnlock {
  statsUnlockedUntil: number;
}

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR" };

export interface RouteState {
  "/calc": { eventType?: EventType } | null;
  "/result": { input: CalcInput } | null;
  "/record/new": {
    prefill?: { eventType: EventType; relation: RelationType; amount: number };
  } | null;
  "/share": { result: CalcResult } | null;
  "/history": null;
  "/stats": null;
  "/settings": null;
}
