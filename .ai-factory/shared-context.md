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
  storage/
    keys.ts
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

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/domain/aggregate.ts
export interface AggregateResult {
export function aggregate(records: HistoryRecord[]): AggregateResult {
export type { HistoryRecord };

// src/domain/calculate.ts
export function calculate(input: CalculationInput): CalculationResult {
export type { CalculationInput, CalculationResult };

// src/domain/rules.ts
export const BASE_AMOUNT: Record<EventType, number> = Object.freeze({
export const RELATION_MULTIPLIER: Record<Relation, number> = Object.freeze({
export const MEAL_COST: Record<EventType, number> = Object.freeze({
export const MIN_AMOUNT = 30000 as const;
export const MAX_AMOUNT = 1000000 as const;
export const RULE_VERSION = 1 as const;

// src/domain/types.ts
export const EVENT_TYPES = ["WEDDING", "FUNERAL", "FIRST_BIRTHDAY", "OPENING"] as const;
export type E

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(8)

Key lessons (verify against actual code before applying):
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 라우팅·Provider·전역 레이아웃 같은 단일 통합 배선 책임은 하나의 워크패킷에만 할당하고, 다른 패킷은 그 위에 페이지 내부 요소만 얹도록 경계를 명확히 나눠라. (60% · 타 앱 1회 — 맹신 금지)