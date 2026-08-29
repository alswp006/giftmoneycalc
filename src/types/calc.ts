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

export interface HistoryItem extends CalcResult {
  /** 저장 시각(ms) — 목록 정렬 키 */
  createdAt: number;
  eventType?: string;
  relation?: string;
}
