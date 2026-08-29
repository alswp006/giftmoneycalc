export const EVENT_LABELS: Record<string, string> = {
  wedding: "결혼식",
  doljanchi: "돌잔치",
  birthday: "생일",
  hwangap: "환갑·칠순",
};

export const RELATION_LABELS: Record<string, string> = {
  family: "가족",
  parent: "부모님",
  relative: "친척",
  friend: "친구",
  colleague: "직장 동료",
  acquaintance: "가끔 보는 사이",
};

export const REGION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "metro", label: "수도권(서울·경기·인천)" },
  { value: "region", label: "지방(그 외 지역)" },
];

export const ATTENDANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "attend", label: "참석" },
  { value: "absent", label: "불참" },
  { value: "host", label: "주최 측" },
];

export const VENUE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "general", label: "일반 예식장" },
  { value: "hotel", label: "호텔·고급 예식장" },
];

export const INTIMACY_LABELS: Record<number, string> = {
  1: "데면데면",
  2: "가끔 연락",
  3: "보통",
  4: "자주 봄",
  5: "아주 가까움",
};

export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function eventLabel(value?: string): string {
  return (value && EVENT_LABELS[value]) || "기타 경조사";
}

export function relationLabel(value?: string): string {
  return (value && RELATION_LABELS[value]) || "지인";
}
