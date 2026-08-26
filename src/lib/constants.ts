import type {
  Attendance,
  EventType,
  Intimacy,
  RegionType,
  RelationType,
  RewardUnlock,
  Settings,
} from "@/lib/types";

export const EVENT_BASE: Record<EventType, number> = {
  wedding: 50000,
  funeral: 50000,
  firstBirthday: 30000,
  opening: 50000,
};

export const RELATION_FACTOR: Record<RelationType, number> = {
  family: 3.0,
  closeFriend: 2.0,
  friend: 1.0,
  coworker: 1.0,
  boss: 1.0,
  acquaintance: 0.6,
};

export const INTIMACY_FACTOR: Record<Intimacy, number> = {
  1: 0.8,
  2: 0.9,
  3: 1.0,
  4: 1.2,
  5: 1.4,
};

export const ATTENDANCE_FACTOR: Record<Attendance, number> = {
  attending: 1.6,
  absent: 1.0,
};

export const REGION_FACTOR: Record<RegionType, number> = {
  seoulGangnam: 1.2,
  metropolitan: 1.1,
  majorCity: 1.0,
  other: 0.9,
};

export const AMOUNT_LADDER: number[] = [
  30000, 50000, 70000, 100000, 150000, 200000, 300000, 500000, 1000000,
];

export const EVENT_LABEL: Record<EventType, string> = {
  wedding: "결혼식",
  funeral: "장례식",
  firstBirthday: "돌잔치",
  opening: "개업식",
};

export const RELATION_LABEL: Record<RelationType, string> = {
  family: "가족·친척",
  closeFriend: "친한 친구",
  friend: "친구·지인",
  coworker: "직장 동료",
  boss: "직장 상사",
  acquaintance: "얼굴만 아는 사이",
};

export const INTIMACY_LABEL: Record<Intimacy, string> = {
  1: "거의 연락 안 함",
  2: "가끔 연락",
  3: "보통",
  4: "자주 만남",
  5: "매우 가까움",
};

export const ATTENDANCE_LABEL: Record<Attendance, string> = {
  attending: "참석·식사",
  absent: "미참석·송금",
};

export const REGION_LABEL: Record<RegionType, string> = {
  seoulGangnam: "서울 강남권",
  metropolitan: "서울(그 외)·수도권",
  majorCity: "광역시",
  other: "그 외 지역",
};

export const REGION_SHORT_LABEL: Record<RegionType, string> = {
  seoulGangnam: "강남",
  metropolitan: "서울·수도권",
  majorCity: "광역시",
  other: "그 외",
};

export const STORAGE_KEYS = {
  records: "gmc:records:v1",
  settings: "gmc:settings:v1",
  lastCalc: "gmc:lastCalc:v1",
  rewardUnlock: "gmc:rewardUnlock:v1",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  defaultRegion: "majorCity",
  onboardingDone: false,
  compactList: false,
};

export const DEFAULT_REWARD_UNLOCK: RewardUnlock = {
  statsUnlockedUntil: 0,
};

export const RECORD_LIMIT = 1000;
export const REWARD_UNLOCK_MS = 86400000;
export const HISTORY_PAGE_SIZE = 20;
export const MIN_STATS_RECORDS = 3;
