export const EVENT_TYPES = ["WEDDING", "FUNERAL", "FIRST_BIRTHDAY", "OPENING"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type StoredEventType = EventType | (string & {});

export const RELATIONS = ["FAMILY", "RELATIVE", "CLOSE_FRIEND", "FRIEND", "COWORKER", "ACQUAINTANCE"] as const;
export type Relation = (typeof RELATIONS)[number];
export type StoredRelation = Relation | (string & {});

export type HistoryRecord = {
  id: string;
  eventType: StoredEventType;
  relation: StoredRelation;
  amount: number;
  recommendedAmount: number;
  attended: boolean;
  companions: number;
  eventDate: string;
  counterpartLabel?: string;
  memo?: string;
  ruleVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type CalculationInput = {
  eventType: EventType;
  relation: Relation;
  attended: boolean;
  companions: number;
  eventDate: string;
};

export type CalculationResult = {
  recommended: number;
  breakdown: {
    base: number;
    relationMultiplier: number;
    mealCost: number;
    companions: number;
    subtotal: number;
    rounded: number;
    clamped: boolean;
  };
  ruleVersion: 1;
};

export type StorageResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code: "INVALID_RECORD" | "RECORD_LIMIT_EXCEEDED" | "QUOTA_EXCEEDED" | "CORRUPTED" | "READ_ONLY_VERSION";
      field?: string;
    };
