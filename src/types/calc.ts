export interface CalcInput {
  eventType: string;
  relation: string;
  intimacy: number;
  region: string;
  attendance: string;
  venue?: string | null;
}

export interface CalcResult {
  recommended: number;
  rangeMin: number;
  rangeMax: number;
}
