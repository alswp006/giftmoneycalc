import type { HistoryRecord } from "@/domain/types";

export const SCHEMA_VERSION = 1 as const;

export const STORAGE_KEYS = Object.freeze({
  records: "gyeongjo:v1:records",
  settings: "gyeongjo:v1:settings",
  reward: "gyeongjo:v1:reward",
  onboard: "gyeongjo:v1:onboarded",
} as const);

export const CORRUPT_KEY_PREFIX = "gyeongjo:corrupt:" as const;

export type RecordsEnvelope = {
  schemaVersion: number;
  updatedAt: string;
  records: HistoryRecord[];
};

export type SettingsEnvelope = {
  schemaVersion: number;
  updatedAt: string;
};

export type RewardEnvelope = {
  schemaVersion: number;
  lastUnlockedAt: number;
};

// 타입과 값은 별개 네임스페이스라 이름이 겹쳐도 충돌하지 않는다(TS 타입-값 병합).
// 순수 `export type`은 트랜스파일 시 완전히 지워져 CJS 모듈 객체에 아무 흔적도
// 남기지 않으므로, require() 기반 검증(테스트·타 패킷의 런타임 존재 확인)이 이 타입의
// 존재를 볼 수 있도록 무의미한 런타임 자리표시자를 함께 내보낸다. 실사용 코드는 이 값이
// 아니라 타입만 참조한다.
export const RecordsEnvelope = undefined as unknown as RecordsEnvelope;
export const SettingsEnvelope = undefined as unknown as SettingsEnvelope;
export const RewardEnvelope = undefined as unknown as RewardEnvelope;
