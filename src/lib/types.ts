// Domain types — add your app-specific types here

export type EventType = "wedding" | "funeral" | "firstBirthday" | "etc";

export type Relationship =
  | "parents"
  | "siblings"
  | "spouse"
  | "children"
  | "relatives"
  | "friends"
  | "colleagues"
  | "boss"
  | "acquaintance";

export type Region =
  | "seoul"
  | "gyeonggi"
  | "incheon"
  | "busan"
  | "daegu"
  | "daejeon"
  | "gwangju"
  | "ulsan"
  | "sejong"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "jeonbuk"
  | "jeonnam"
  | "gyeongbuk"
  | "gyeongnam"
  | "jeju";

export interface CalcInput {
  eventType: EventType;
  relationship: Relationship;
  region: Region;
  attend: boolean;
  inflationAdjust: boolean;
}

export interface CalcResult {
  recommendedAmount: number;
  rangeMin: number;
  rangeMax: number;
  reasons: string[];
}

export type AppErrorCode = 401 | 403 | 404 | 409 | 413 | 416 | 422 | 500 | 507;

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; message: string } };

export interface GiftRecord {
  id: string;
  personName: string;
  eventType: EventType;
  relationship: Relationship;
  eventDate: string; // YYYY-MM-DD
  amount: number;
  memo?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  defaultRegion: Region;
  inflationAdjustDefault: boolean;
  rewardUnlockedUntil: number | null;
}

export interface StatsSummary {
  totalRecords: number;
  totalAmount: number;
  averageAmount: number;
  eventTypeCounts: Record<EventType, number>;
}

export type RouteState = {
  "/": undefined;
  "/calc": { prefill?: Partial<CalcInput> } | undefined;
  "/result": { input: CalcInput; result: CalcResult } | undefined;
  "/history": { prefill: (CalcInput & { recommendedAmount: number }) | null } | undefined;
  "/share": { input: CalcInput; result: CalcResult } | undefined;
  "/settings": undefined;
};
