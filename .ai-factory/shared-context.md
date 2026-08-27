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

export type RouteState = "home" | "result" | "history" | "history-detail" | "stats";

export type CalculationInput = { amount: number; years: number; rate: number; compounding: "annual" | "monthly" | "daily" };

export type CalculationResult = { principal: number; interest: number; finalAmount: number; summary: string };

export type Record = { id: string; date: string; input: CalculationInput; result: CalculationResult; isFavorite: boolean };

export type Settings = { currency: "KRW" | "USD"; theme: "light" | "dark"; notificationsEnabled: boolean };

export type OnboardingState = { completed: boolean; version: number };

export type Envelope = { version: number; data: T; timestamp: number; checksum: string };

export type RECORD_KEY = "records";

export type SETTINGS_KEY = "settings";

export type ONBOARDING_KEY = "onboarding";

export type REWARD_KEY = "reward_state";

export type calculateFn = (input: CalculationInput) => CalculationResult;

export type aggregateFn = (records: Record[]) => { totalAmount: number; avgRate: number; recordCount: number };

export type createRecordFn = async (input: CalculationInput, result: CalculationResult) => Promise<Record>;

export type updateRecordFn = async (id: string, updates: Partial<Record>) => Promise<Record>;

export type deleteRecordFn = async (id: string) => Promise<void>;

export type getRecordsFn = async () => Promise<Record[]>;

export type getPrefFn = async (key: string) => Promise<any>;

export type setPrefFn = async (key: string, value: any) => Promise<void>;

export type useRecordsFn = () => { records: Record[]; loading: boolean; error: Error | null; createRecord: (input: CalculationInput, result: CalculationResult) => Promise<Record>; updateRecord: (id: string, updates: Partial<Record>) => Promise<void>; deleteRecord: (id: string) => Promise<void>; fetchRecords: () => Promise<void> };

export type AdConfig = { bannerAdUnitId: string; rewardedAdUnitId: string; nativeAdUnitId: string };

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