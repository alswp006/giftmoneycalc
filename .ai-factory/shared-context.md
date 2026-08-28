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
export type AppErrorCode = type AppErrorCode = 'DUPLICATE_RECORD' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'STORAGE_ERROR' | 'NETWORK_ERROR';

/** 도메인 엔티티 - 0004 연산, 0007+ UI 전역 (구현: 패킷 0001) */
export type Record = { id: string; date: string; amountKrw: number; category?: string; memo?: string; createdAt: string; updatedAt: string };

/** 설정 저장소 - 0005 관리, 0018 UI (구현: 패킷 0001) */
export type Settings = { rewardUnlockTime?: number; currency?: string; categoryFilters?: string[] };

/** 라우팅 상태 - App.tsx (0019) 라우터 상수 (구현: 패킷 0001) */
export type RouteState = 'home' | 'calc' | 'result' | 'history' | 'history/:id' | 'stats' | 'share' | 'settings';

/** 에러 코드→문구 변환 - 모든 에러 핸들링 패킷 (구현: 패킷 0002) */
export type getErrorMessageFn = (code: AppErrorCode) => string;

/** 레코드 변경 구독 - 0007 훅 기초, 0012+ UI 반응 (구현: 패킷 0004) */
export type subscribeRecordsFn = (callback: (records: Record[]) => void) => () => void;

/** 레코드 생성 - 0009 calc, 0013 sheet (구현: 패킷 0004) */
export type createRecordFn = (data: Omit<Record, 'id' | 'createdAt' | 'updatedAt'>) => Record;

/** 레코드 수정 - 0013 sheet, 0014 detail (구현: 패킷 0004) */
export type updateRecordFn = (id: string, data: Partial<Omit<Record, 'id' | 'createdAt' | 'updatedAt'>>) => Record;

/** 레코드 삭제 - 0014 detail (구현: 패킷 0004) */
export type deleteRecordFn = (id: string) => void;

/** 필터 조회 - 0012 history, 0015 stats (구현: 패킷 0004) */
export type queryRecordsFn = (filter?: { category?: string; startDate?: string; endDate?: string }) => Record[];

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
export {};

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
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
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
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.