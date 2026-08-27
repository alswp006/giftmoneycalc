# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
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

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
export * from "@/domain/types";

import type { CalculationInput } from "@/domain/types";

export type RouteState = {
  "/result"?: { input: CalculationInput } | { recordId: string } | null;
  "/history/:id"?: { from?: "list" | "result" } | null;
  "/"?: { prefill?: Partial<CalculationInput> } | null;
  "/stats"?: null;
};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    SaveRecordSheet.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  domain/
    __tests__/
    aggregate.ts
    calculate.ts
    rules.ts
    types.ts
  hooks/
  lib/
    contract.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  state/
    RecordsProvider.tsx
    __tests__/
    useRecords.ts
  storage/
    __tests__/
    envelope.ts
    keys.ts
    migrations.ts
    prefs.ts
    records.ts
    uuid.ts
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type StorageKeys =; export type AdGroupId = string; export type AdSlotId = string; export type calculateFn = (input: CalculationInput) => CalculationResult; export type aggregateFn = (records: HistoryRecord[]) =>; export type saveRecordFn = ( input: Omit<HistoryRecord, "id" | "createdAt" | "updatedAt">, ) => Promise<import("@/domain; export type updateRecordFn = ( id: string, patch: Partial<Omit<HistoryRecord, "id" | "createdAt">>, ) => Promise<import(
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type RouteState =
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- SaveRecordSheet.tsx: SaveRecordSheet
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/contract.ts → imports: domain/types, lib/types, domain/types
  lib/types.ts → imports: domain/types, domain/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입·열거형·RouteState 선언 (files: src/domain/types.ts, src/lib/types.ts)
- 0002: 룰 테이블 상수 · 저장소 키 · Envelope 타입 (files: src/domain/rules.ts, src/storage/keys.ts)
- 0003: 계산 엔진 calculate() + 집계 aggregate() + 결정론 스캔 테스트 (files: src/domain/calculate.ts, src/domain/aggregate.ts, src/domain/__tests__/calculate.test.ts, src/domain/__tests__/determinism.scan.test.ts)
- 0004: 저장소 저수준 I/O — Envelope 읽기/쓰기 · 손상 격리 · 마이그레이션 · UUID 폴백 (files: src/storage/envelope.ts, src/storage/migrations.ts, src/storage/uuid.ts, src/storage/__tests__/envelope.test.ts, src/storage/__tests__/uuid.test.ts)
- 0005: 레코드 CRUD + 설정·리워드·온보딩 저장소 (files: src/storage/records.ts, src/storage/prefs.ts, src/storage/__tests__/records.test.ts)
- 0006: 상태 관리 — RecordsProvider + useRecords (낙관적 업데이트·롤백) (files: src/state/RecordsProvider.tsx, src/state/useRecords.ts, src/state/__tests__/useRecords.test.tsx)
- 0008: 기록 저장 BottomSheet 컴포넌트 SaveRecordSheet (files: src/components/SaveRecordSheet.tsx)