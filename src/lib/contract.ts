/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 *
 * 도메인 타입(HistoryRecord/EventType/Relation/CalculationInput/CalculationResult/
 * StorageResult)은 src/domain/types.ts가 단일 원천이므로 여기서 재선언하지 않고 재수출한다.
 */

export type {
  EventType,
  Relation,
  StoredEventType,
  StoredRelation,
  HistoryRecord,
  CalculationInput,
  CalculationResult,
  StorageResult,
} from "@/domain/types";

export type { RouteState } from "@/lib/types";

import type { CalculationInput, CalculationResult, HistoryRecord } from "@/domain/types";

// 저장소 키 (§1.3) — 실제 상수 선언은 F1 저장소 레이어(src/storage/)에서 이루어진다.
export type StorageKeys = {
  records: "gyeongjo:v1:records";
  settings: "gyeongjo:v1:settings";
  reward: "gyeongjo:v1:reward";
  onboard: "gyeongjo:v1:onboarded";
};

// 광고 식별자 (§1.6 — 규범). 두 값은 서로 다른 콘솔 등록 항목이며 하나로 통일하지 않는다.
export type AdGroupId = string; // <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />
export type AdSlotId = string; // <TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID} />

// 계산 엔진 (F2 AC-2)
export type calculateFn = (input: CalculationInput) => CalculationResult;

// 통계 집계 (F6 AC-1)
export type aggregateFn = (records: HistoryRecord[]) => {
  totalCount: number;
  totalAmount: number;
  avgAmount: number;
  byEventType: Record<string, { count: number; sum: number }>;
  monthly: Array<{ ym: string; sum: number }>;
};

// 저장소 CRUD (F1 AC-1, F1 AC-3 — 정확한 함수명이 명시된 항목만 포함)
export type saveRecordFn = (
  input: Omit<HistoryRecord, "id" | "createdAt" | "updatedAt">,
) => Promise<import("@/domain/types").StorageResult<HistoryRecord>>;

export type updateRecordFn = (
  id: string,
  patch: Partial<Omit<HistoryRecord, "id" | "createdAt">>,
) => Promise<import("@/domain/types").StorageResult<HistoryRecord>>;
