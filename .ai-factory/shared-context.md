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
 */

/** 모든 패킷이 참조하는 에러 코드 열거형 (구현: 패킷 0001) */
export type AppErrorCode = 'DUPLICATE_RECORD' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'STORAGE_ERROR' | 'NETWORK_ERROR';

/** 도메인 엔티티 - 0004 연산, 0007+ UI 전역 (구현: 패킷 0001) */
export type DomainRecord = { id: string; date: string; amountKrw: number; category?: string; memo?: string; createdAt: string; updatedAt: string };

/** 설정 저장소 - 0005 관리, 0018 UI (구현: 패킷 0001) */
export type Settings = { rewardUnlockTime?: number; currency?: string; categoryFilters?: string[] };

/** 라우팅 상태 - App.tsx (0019) 라우터 상수 (구현: 패킷 0001) */
export type RouteState = 'home' | 'calc' | 'result' | 'history' | 'history/:id' | 'stats' | 'share' | 'settings';

/** 에러 코드→문구 변환 - 모든 에러 핸들링 패킷 (구현: 패킷 0002) */
export type getErrorMessageFn = (code: AppErrorCode) => string;

/** 레코드 변경 구독 - 0007 훅 기초, 0012+ UI 반응 (구현: 패킷 0004) */
export type subscribeRecordsFn = (callback: (records: DomainRecord[]) => void) => () => void;

/** 레코드 생성 - 0009 calc, 0013 sheet (구현: 패킷 0004) */
export type createRecordFn = (data: Omit<DomainRecord, 'id' | 'createdAt' | 'updatedAt'>) => DomainRecord;

/** 레코드 수정 - 0013 sheet, 0014 detail (구현: 패킷 0004) */
export type updateRecordFn = (id: string, data: Partial<Omit<DomainRecord, 'id' | 'createdAt' | 'updatedAt'>>) => DomainRecord;

/** 레코드 삭제 - 0014 detail (구현: 패킷 0004) */
export type deleteRecordFn = (id: string) => void;

/** 필터 조회 - 0012 history, 0015 stats (구현: 패킷 0004) */
export type queryRecordsFn = (filter?: { category?: string; startDate?: string; endDate?: string }) => DomainRecord[];

/** 설정 부분 갱신 - 0018 settings page (구현: 패킷 0005) */
export type updateSettingsFn = (partial: Partial<Settings>) => Settings;

/** 현재 설정 조회 - 0007, 0018 (구현: 패킷 0005) */
export type getSettingsFn = () => Settings;

/** 규칙 기반 계산 - 0009 입력화면, 0010 결과화면 (구현: 패킷 0006) */
export type calculateFn = (amountKrw: number, opts?: { category?: string }) => { resultAmount: number; breakdown?: Record<string, number> };

/** 오버레이 상태 관리 훅 - 0011 RewardGate, 0013 RecordSheet (구현: 패킷 0019) */
export type useOverlayLifecycleFn = (key: string) => { isOpen: boolean; open: () => void; close: () => void };

/** 광고 설정 훅 - 0011 gate, 0016 stats detail (구현: 패킷 0020) */
export type useAdConfigFn = () => { isEnabled: boolean; adUnit: string; rewardDelay: number };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — add your app-specific types here

export type EventType = "wedding" | "funeral" | "firstBirthday" | "etc";

export type Relationship =
  | "parents"
  | "siblings"
  | "spouse"
  | "children"
  | "relatives"
  | "friends"
  | "colleagues"
  | "boss"
  | "acquaintance";

export type Region =
  | "seoul"
  | "gyeonggi"
  | "incheon"
  | "busan"
  | "daegu"
  | "daejeon"
  | "gwangju"
  | "ulsan"
  | "sejong"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "jeonbuk"
  | "jeonnam"
  | "gyeongbuk"
  | "gyeongnam"
  | "jeju";

export interface CalcInput {
  eventType: EventType;
  relationship: Relationship;
  region: Region;
  attend: boolean;
  inflationAdjust: boolean;
}

export interface CalcResult {
  recommendedAmount: number;
  rangeMin: number;
  rangeMax: number;
  reasons: string[];
}

export type AppErrorCode = 401 | 403 | 404 | 409 | 413 | 416 | 422 | 500 | 507;

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; message: string } };

export interface GiftRecord {
  id: string;
  personName: string;
  eventType: EventType;
  relationship: Relationship;
  eventDate: string; // YYYY-MM-DD
  amount: number;
  memo?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  defaultRegion: Region;
  inflationAdjustDefault: boolean;
  rewardUnlockedUntil: number | null;
}

export interface StatsSummary {
  totalAmount: number;
  count: number;
  avgAmount: number;
  byEventType: Array<{
    type: EventType;
    amount: number;
    ratio: number;
  }>;
  monthlyTrend: Array<{
    month: string; // YYYY-MM format
    amount: number;
  }>;
  topRelationship: Relationship | null;
}

export type RouteState = {
  "/": undefined;
  "/calc": { prefill?: Partial<CalcInput> } | undefined;
  "/result": { input: CalcInput; result: CalcResult } | undefined;
  "/history": { prefill: (CalcInput & { recommendedAmount: number }) | null } | undefined;
  "/share": { input: CalcInput; result: CalcResult } | undefined;
  "/settings": undefined;
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
    RewardGate.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
    useRecords.ts
    useSettings.ts
  lib/
    calc.test.ts
    calc.ts
    contract.ts
    errors.test.ts
    errors.ts
    records.ts
    rules.ts
    settings.ts
    stats.ts
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
- calc.ts: export function calculate(input: CalcInput): CalcResult
- contract.ts: export type AppErrorCode = 'DUPLICATE_RECORD' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'STORAGE_ERROR' | 'NETWORK_ERROR'; export type DomainRecord =; export type Settings =; export type RouteState = 'home' | 'calc' | 'result' | 'history' | 'history/:id' | 'stats' | 'share' | 'settings'; export type getErrorMessageFn = (code: AppErrorCode) => string; export type subscribeRecordsFn = (callback: (records: DomainRecord[]) => void) => () => void; export type createRecordFn = (data: Omit<DomainRecord, 'id' | 'createdAt' | 'updatedAt'>) => DomainRecord; export type updateRecordFn = (id: string, data: Partial<Omit<DomainRecord, 'id' | 'createdAt' | 'updatedAt'>>) => Domain
- errors.ts: export const ERROR_MESSAGES: Record<AppErrorCode, string> =; export function getErrorMessage(code: AppErrorCode): string; export function fail(code: AppErrorCode); export function ok<T>(data: T)
- records.ts: export type CreateRecordInput = Omit< GiftRecord, "id" | "createdAt" | "updatedAt" | "relationship" > &; export type UpdateRecordPatch = Partial< Omit<GiftRecord, "id" | "createdAt" | "updatedAt"> >; export type RecordFilter =; export function createRecord( input: CreateRecordInput, opts?:; export function updateRecord( id: string, patch: UpdateRecordPatch, baseUpdatedAt: number, ): Result<GiftRecord>; export function deleteRecord(id: string): Result<void>; export function queryRecords(filter?: RecordFilter): GiftRecord[]; export function subscribeRecords(cb: Listener): () => void
- rules.ts: export const ROUND_UNIT = 10000; export const BASE_AMOUNT_TABLE: Record<EventType, Record<Relationship, number>> =; export const ATTEND_MULTIPLIER = 1.0; export const ABSENT_MULTIPLIER = 0.8; export const REGION_MULTIPLIER: Record<Region, number> =; export const INFLATION_MULTIPLIER = 1.05; export const NO_INFLATION_MULTIPLIER = 1.0; export const RANGE_MIN_RATIO = 0.8
- settings.ts: export function getSettings(): AppSettings; export function saveSettings(partial: Partial<AppSettings>): Result<AppSettings>; export function unlockReward(now: number): Result<AppSettings>; export function isRewardUnlocked(now: number): boolean; export function updateSettings(partial: Partial<Settings>): Settings
- stats.ts: export function aggregate(records: GiftRecord[], _now: number): StatsSummary
- storage.ts: export function readRecords(): GiftRecord[]; export function writeRecords(records: GiftRecord[]): Result<void>; export function readSettings(): AppSettings; export function writeSettings(settings: AppSettings): Result<void>; export function clearAll(): Result<void>
- types.ts: export type EventType = "wedding" | "funeral" | "firstBirthday" | "etc"; export type Relationship = | "parents" | "siblings" | "spouse" | "children" | "relatives" | "friends" | "colleagues" | "; export type Region = | "seoul" | "gyeonggi" | "incheon" | "busan" | "daegu" | "daejeon" | "gwangju" | "ulsan" | "sejong"; export interface CalcInput; export interface CalcResult; export type AppErrorCode = 401 | 403 | 404 | 409 | 413 | 416 | 422 | 500 | 507; export type Result<T> = |; export interface GiftRecord
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
- RewardGate.tsx: RewardGate
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/calc.ts → imports: lib/types, lib/rules
  lib/errors.ts → imports: lib/types
  lib/records.ts → imports: lib/types, lib/errors, lib/storage
  lib/rules.ts → imports: lib/types
  lib/settings.ts → imports: lib/types, lib/contract, lib/errors, lib/storage
  lib/stats.ts → imports: lib/types
  lib/storage.ts → imports: lib/types, lib/errors
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 · AppErrorCode · RouteState 정의 (files: src/lib/types.ts)
- 0002: 오류 문구 단일 소스 errors.ts + 하드코딩 검증 스크립트 (files: src/lib/errors.ts, src/lib/errors.test.ts, scripts/check-error-source.mjs)
- 0003: localStorage CRUD 기반 모듈 (키 격리 · 413 · 507) (files: src/lib/storage.ts, src/lib/storage.test.ts)
- 0004: 레코드 도메인 연산 (409 중복·낙관적 잠금 · 404 · subscribeRecords) (files: src/lib/records.ts, src/lib/records.test.ts)
- 0005: 설정 저장 계층 (확인 후 반영 · 리워드 24시간 해제) (files: src/lib/settings.ts, src/lib/settings.test.ts)
- 0006: 계산 엔진 (rules.ts 상수 격리 + calc.ts 결정론 함수) (files: src/lib/rules.ts, src/lib/calc.ts, src/lib/calc.test.ts)
- 0007: 통계 집계 함수 + 상태 관리 훅 (useRecords · useSettings) (files: src/lib/stats.ts, src/lib/stats.test.ts, src/hooks/useRecords.ts, src/hooks/useSettings.ts)
- 0011: 결과 상세 리워드 게이트 (TossRewardAd · 24시간 해제) (files: src/components/RewardGate.tsx, src/components/RewardGate.test.tsx)

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

// src/components/RewardGate.tsx
export function RewardGate({ children, lockedPreview, slotId = DEFAULT_SLOT_ID }: RewardGateProps) {

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

// src/hooks/useRecords.ts
export function useRecords(): {

// src/hooks/useSettings.ts
export function useSettings(): {

// src/lib/calc.ts
export function calculate(input: CalcInput): CalcResult {

// src/lib/contract.ts
export type AppErrorCode = 'DUPLICATE_RECORD' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'STORAGE_ERROR' | 'NETWORK_ERROR';
export type DomainRecord = { id: string; date: string; amountKrw: number; category?: string; memo?: string; createdAt: string; updatedAt: string };
export type Settings = { rewardUnlockTime?: number; currency?: string; categoryFilters?: string[] };
export type RouteState = 'home' | 'calc' | 'result' | 'history' | 'history/:id' | '

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(8)

Key lessons (verify against actual code before applying):
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 라우팅·Provider·전역 레이아웃 같은 단일 통합 배선 책임은 하나의 워크패킷에만 할당하고, 다른 패킷은 그 위에 페이지 내부 요소만 얹도록 경계를 명확히 나눠라. (60% · 타 앱 1회 — 맹신 금지)