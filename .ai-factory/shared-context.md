# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
import type { ReactNode } from 'react';

/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 기본 기록 엔티티 — 모든 페이지에서 참조 (구현: 패킷 0001) */
export type GiftRecord = { id: string; type: RecordType; recipientId: string; amountKrw: number; date: string; occasion?: string };

/** 기록 유형 enum — 계산·필터링·라벨링 (구현: 패킷 0001) */
export type RecordType = 'gift' | 'received' | 'household';

/** 계산 엔진의 반환값 — 0009(Calc), 0010(Result)에서 사용 (구현: 패킷 0001) */
export type CalcResult = { amountKrw: number; reason: string; sourceTable: string };

/** 페이지 간 라우트 상태 전달 — 계산→결과 흐름 (구현: 패킷 0001) */
export type RouteState = { recordType?: RecordType; recipientId?: string; calcResult?: CalcResult; giftRecord?: GiftRecord };

/** 사용자 설정 스키마 — 0015(Settings)에서 수정 (구현: 패킷 0005) */
export type Settings = { defaultLocale: string; listDensity: 'compact' | 'normal'; hideAds?: boolean };

/** 기록 유형별 UI 라벨·아이콘 — 0008, 0009, 0012에서 참조 (구현: 패킷 0002) */
export type RECORD_TYPES = Record<RecordType, { label: string; emoji: string }>;

/** localStorage 키 정의 — 0004, 0005에서 사용 (구현: 패킷 0002) */
export type STORAGE_KEYS = { records: string; lastCalc: string; settings: string };

/** 계산 계수·테이블 — 0003(계산 엔진), 0006(통계)에서 참조 (구현: 패킷 0002) */
export type CALC_PARAMS = { relationshipCoefficients: Record<string, number>; anniversaryYears: number[] };

/** 선물 금액 계산 엔진 — 0009(폼), 0010(결과), 0013(통계)에서 호출 (구현: 패킷 0003) */
export type calcGiftAmountFn = (type: RecordType, recipientId: string, opts?: { customAmount?: number }) => CalcResult;

/** KRW 금액 포맷 — 모든 페이지에서 금액 표시 (구현: 패킷 0003) */
export type formatAmountKrwFn = (amount: number, opts?: { short?: boolean }) => string;

/** 날짜 포맷 — 0008(홈), 0012(히스토리)에서 사용 (구현: 패킷 0003) */
export type formatDateFn = (date: string, format?: 'short' | 'long') => string;

/** 전역 스토리지 훅 — 모든 페이지의 상태 접근 (구현: 패킷 0005) */
export type useStorageFn = () => { records: GiftRecord[]; addRecord(r: GiftRecord): void; deleteRecord(id: string): void; settings: Settings };

/** 기록 통계 집계 — 0013(Stats), 0014(Share)에서 사용 (구현: 패킷 0006) */
export type aggregateStatsFn = (records: GiftRecord[]) => { totalSpent: number; avgGift: number; recordCount: number; byType: Record<RecordType, number> };

/** 캔버스 공유 카드 렌더러 — 0014(Share)에서만 사용하지만 복잡도 높음 (구현: 패킷 0006) */
export type drawShareCardFn = (ctx: CanvasRenderingContext2D, data: ShareCardData) => void;

/** drawShareCard()의 입력 데이터 스키마 (구현: 패킷 0006) */
export type ShareCardData = { totalKrw: number; recordCount: number; topRecipient: string; period: string };

/** 폼 제출 버튼 컴포넌트 props — 0009(Calc), 0011(RecordNew)에서 사용 (구현: 패킷 0007) */
export type SubmitFooter = { onSubmit: () => void; isLoading?: boolean; disabled?: boolean };

/** 결과 요약 헤더 컴포넌트 props — 0010(Result), 0013(Stats)에서 사용 (구현: 패킷 0007) */
export type SummaryHero = { title: string; amount: number; subtitle?: string };

/** 선택 칩 그룹 컴포넌트 props — 0009(유형 선택), 0012(필터)에서 사용 (구현: 패킷 0007) 
```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — GiftMoneyCalc

export type EventType = "wedding" | "funeral" | "firstBirthday" | "opening";

export type RelationType =
  | "family"
  | "closeFriend"
  | "friend"
  | "coworker"
  | "boss"
  | "acquaintance";

export type RegionType = "seoulGangnam" | "metropolitan" | "majorCity" | "other";

export type Attendance = "attending" | "absent";

export type Intimacy = 1 | 2 | 3 | 4 | 5;

export type Direction = "given" | "received";

export interface CalcInput {
  eventType: EventType;
  relation: RelationType;
  intimacy: Intimacy;
  attendance: Attendance;
  region: RegionType;
}

export interface BreakdownItem {
  label: string;
  factor: number;
}

export interface CalcResult {
  recommended: number;
  min: number;
  max: number;
  rawAmount: number;
  breakdown: BreakdownItem[];
  input: CalcInput;
}

export interface GiftRecord {
  id: string;
  personName: string;
  eventType: EventType;
  relation: RelationType;
  amount: number;
  date: string;
  direction: Direction;
  memo: string;
  createdAt: number;
}

export interface Settings {
  defaultRegion: RegionType;
  onboardingDone: boolean;
  compactList: boolean;
}

export interface LastCalc {
  input: CalcInput;
  result: CalcResult;
  at: number;
}

export interface RewardUnlock {
  statsUnlockedUntil: number;
}

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR" };

export interface RouteState {
  "/calc": { eventType?: EventType } | null;
  "/result": { input: CalcInput } | null;
  "/record/new": {
    prefill?: { eventType: EventType; relation: RelationType; amount: number };
  } | null;
  "/share": { result: CalcResult } | null;
  "/history": null;
  "/stats": null;
  "/settings": null;
}

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
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    __tests__/
    calc.ts
    constants.ts
    contract.ts
    format.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- calc.ts: export function calcGiftAmount(input: CalcInput): CalcResult
- constants.ts: export const EVENT_BASE: Record<EventType, number> =; export const RELATION_FACTOR: Record<RelationType, number> =; export const INTIMACY_FACTOR: Record<Intimacy, number> =; export const ATTENDANCE_FACTOR: Record<Attendance, number> =; export const REGION_FACTOR: Record<RegionType, number> =; export const AMOUNT_LADDER: number[] = [ 30000, 50000, 70000, 100000, 150000, 200000, 300000, 500000, 1000000, ]; export const EVENT_LABEL: Record<EventType, string> =; export const RELATION_LABEL: Record<RelationType, string> =
- contract.ts: export type GiftRecord =; export type RecordType = 'gift' | 'received' | 'household'; export type CalcResult =; export type RouteState =; export type Settings =; export type RECORD_TYPES = Record<RecordType,; export type STORAGE_KEYS =; export type CALC_PARAMS =
- format.ts: export function formatKRW(amount: number): string; export function formatAmountKrw(amount: number, opts?:; export function formatDate(date: string, format: "short" | "long" = "short"): string
- storage.ts: export function getRecords(): GiftRecord[]; export function addRecord( personName: string, eventType: EventType, relation: RelationType, amount: number, date: strin; export function deleteRecord(id: string): WriteResult; export function getSettings(): Settings; export function saveSettings(settings: Settings): WriteResult; export function getLastCalc(): LastCalc | null; export function saveLastCalc(lastCalc: LastCalc): WriteResult; export function getRewardUnlock(): RewardUnlock
- types.ts: export type EventType = "wedding" | "funeral" | "firstBirthday" | "opening"; export type RelationType = | "family" | "closeFriend" | "friend" | "coworker" | "boss" | "acquaintance"; export type RegionType = "seoulGangnam" | "metropolitan" | "majorCity" | "other"; export type Attendance = "attending" | "absent"; export type Intimacy = 1 | 2 | 3 | 4 | 5; export type Direction = "given" | "received"; export interface CalcInput; export interface BreakdownItem
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
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/calc.ts → imports: lib/constants, lib/format, lib/types
  lib/constants.ts → imports: lib/types
  lib/storage.ts → imports: lib/types, lib/constants
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: 계수·라벨·스토리지 상수 테이블 (files: src/lib/constants.ts)
- 0003: 계산 엔진 calcGiftAmount() + 금액 포맷터 (files: src/lib/calc.ts, src/lib/format.ts, src/lib/__tests__/calc.test.ts)
- 0004: localStorage 타입 안전 래퍼 storage.ts (files: src/lib/storage.ts, src/lib/__tests__/storage.test.ts)