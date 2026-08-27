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
