import type { HistoryItem } from "../types/calc";

export const HISTORY_STORAGE_KEY = "giftmoney.history";

export function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 사파리 프라이빗 모드 등 저장 불가 환경 — 화면은 그대로 동작시킨다.
  }
}

export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 삭제 실패는 무시한다.
  }
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.recommended === "number" &&
    typeof item.rangeMin === "number" &&
    typeof item.rangeMax === "number"
  );
}

/**
 * @AI:NOTE 값 없음 / 손상 JSON / 비배열 JSON 모두 빈 배열로 폴백한다 — 화면이 흰 화면으로 죽지 않게.
 */
export function getHistoryList(): HistoryItem[] {
  const raw = getItem(HISTORY_STORAGE_KEY);
  if (raw == null || raw === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isHistoryItem).map((item) => ({
    recommended: item.recommended,
    rangeMin: item.rangeMin,
    rangeMax: item.rangeMax,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
    eventType: typeof item.eventType === "string" ? item.eventType : undefined,
    relation: typeof item.relation === "string" ? item.relation : undefined,
  }));
}

/** 최신 기록을 앞에 두고 최대 30건까지 보관한다. */
export function addHistoryItem(item: HistoryItem): HistoryItem[] {
  const next = [item, ...getHistoryList()].slice(0, 30);
  setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  removeItem(HISTORY_STORAGE_KEY);
}
