import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Direction,
  EventType,
  GiftRecord,
  LastCalc,
  RelationType,
  RewardUnlock,
  Settings,
  WriteResult,
} from "@/lib/types";
import {
  DEFAULT_REWARD_UNLOCK,
  DEFAULT_SETTINGS,
  RECORD_LIMIT,
  REWARD_UNLOCK_MS,
  STORAGE_KEYS,
} from "@/lib/constants";
import {
  clearAllData,
  getLastCalc,
  getRecords,
  getRewardUnlock,
  getSettings,
  saveLastCalc,
  saveRewardUnlock,
  saveSettings,
} from "@/lib/storage";

export type AddRecordResult =
  | { ok: true; id: string }
  | { ok: false; reason: "QUOTA_EXCEEDED" | "LIMIT_REACHED" | "PARSE_ERROR" };

export interface StorageState {
  ready: boolean;
  loadError: boolean;
  records: GiftRecord[];
  settings: Settings;
  lastCalc: LastCalc | null;
  rewardUnlock: RewardUnlock;
  addRecord(
    personName: string,
    eventType: EventType,
    relation: RelationType,
    amount: number,
    date: string,
    direction: Direction,
    memo: string
  ): AddRecordResult;
  deleteRecord(id: string): WriteResult;
  updateSettings(next: Settings): WriteResult;
  setLastCalc(next: LastCalc): WriteResult;
  unlockStats(): WriteResult;
  clearAll(): void;
}

/**
 * @AI:NOTE 기록 목록만 쓰기 전용 저장 함수가 storage.ts에 없다(addRecord/deleteRecord는
 * 내부에서 다시 읽는다). 스토어는 메모리 상태가 원본이므로 재조회 없이 쓰기만 한다.
 */
function persistRecords(records: GiftRecord[]): WriteResult {
  try {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
    return { ok: true };
  } catch {
    return { ok: false, reason: "QUOTA_EXCEEDED" };
  }
}

/** 저장소 읽기는 손상된 값·접근 차단 환경에서 throw할 수 있다 → 키마다 기본값으로 격리한다. */
function readSafely<T>(read: () => T, fallback: T): { value: T; failed: boolean } {
  try {
    const value = read();
    if (value === undefined) return { value: fallback, failed: true };
    return { value, failed: false };
  } catch {
    return { value: fallback, failed: true };
  }
}

const FALLBACK_WRITE: WriteResult = { ok: false, reason: "PARSE_ERROR" };

/**
 * Provider 밖에서 useStorage()를 부르더라도 undefined가 아니라 기본값을 돌려준다
 * — 훅 하나 때문에 화면 전체가 흰 화면이 되는 것을 막는다.
 */
const FALLBACK_STATE: StorageState = {
  ready: false,
  loadError: false,
  records: [],
  settings: DEFAULT_SETTINGS,
  lastCalc: null,
  rewardUnlock: DEFAULT_REWARD_UNLOCK,
  addRecord: () => ({ ok: false, reason: "PARSE_ERROR" }),
  deleteRecord: () => FALLBACK_WRITE,
  updateSettings: () => FALLBACK_WRITE,
  setLastCalc: () => FALLBACK_WRITE,
  unlockStats: () => FALLBACK_WRITE,
  clearAll: () => {},
};

const StorageContext = createContext<StorageState>(FALLBACK_STATE);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [records, setRecords] = useState<GiftRecord[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [lastCalc, setLastCalcState] = useState<LastCalc | null>(null);
  const [rewardUnlock, setRewardUnlock] = useState<RewardUnlock>(DEFAULT_REWARD_UNLOCK);

  // @AI:NOTE StrictMode는 setState 업데이터를 두 번 실행한다 → 저장·UUID 생성 같은
  // 부수효과를 업데이터 안에 두면 안 된다. 최신 목록은 ref로 읽고 쓰기는 밖에서 한 번만.
  const recordsRef = useRef<GiftRecord[]>(records);
  const commitRecords = useCallback((next: GiftRecord[]) => {
    recordsRef.current = next;
    setRecords(next);
  }, []);

  // 마운트 후 1회만 읽는다. 이후 메모리 상태가 원본이고 쓰기는 단방향으로 반영한다.
  useEffect(() => {
    const loadedRecords = readSafely<GiftRecord[]>(getRecords, []);
    const loadedSettings = readSafely<Settings>(getSettings, DEFAULT_SETTINGS);
    const loadedLastCalc = readSafely<LastCalc | null>(getLastCalc, null);
    const loadedUnlock = readSafely<RewardUnlock>(getRewardUnlock, DEFAULT_REWARD_UNLOCK);

    commitRecords(Array.isArray(loadedRecords.value) ? loadedRecords.value : []);
    setSettings({ ...DEFAULT_SETTINGS, ...(loadedSettings.value ?? {}) });
    setLastCalcState(loadedLastCalc.value ?? null);
    setRewardUnlock({ ...DEFAULT_REWARD_UNLOCK, ...(loadedUnlock.value ?? {}) });
    setLoadError(
      loadedRecords.failed ||
        loadedSettings.failed ||
        loadedLastCalc.failed ||
        loadedUnlock.failed
    );
    setReady(true);
  }, [commitRecords]);

  const addRecord = useCallback<StorageState["addRecord"]>(
    (personName, eventType, relation, amount, date, direction, memo) => {
      const prev = recordsRef.current;
      if (prev.length >= RECORD_LIMIT) {
        return { ok: false, reason: "LIMIT_REACHED" };
      }

      const record: GiftRecord = {
        id: crypto.randomUUID(),
        personName,
        eventType,
        relation,
        amount,
        date,
        direction,
        memo,
        createdAt: Date.now(),
      };
      const next = [...prev, record];
      const written = persistRecords(next);
      if (!written.ok) return written;

      commitRecords(next);
      return { ok: true, id: record.id };
    },
    [commitRecords]
  );

  const deleteRecord = useCallback<StorageState["deleteRecord"]>(
    (id) => {
      const next = recordsRef.current.filter((r) => r.id !== id);
      const written = persistRecords(next);
      if (written.ok) commitRecords(next);
      return written;
    },
    [commitRecords]
  );

  const updateSettings = useCallback<StorageState["updateSettings"]>((next) => {
    const written = saveSettings(next);
    if (written.ok) setSettings(next);
    return written;
  }, []);

  const setLastCalc = useCallback<StorageState["setLastCalc"]>((next) => {
    const written = saveLastCalc(next);
    if (written.ok) setLastCalcState(next);
    return written;
  }, []);

  const unlockStats = useCallback<StorageState["unlockStats"]>(() => {
    const next: RewardUnlock = { statsUnlockedUntil: Date.now() + REWARD_UNLOCK_MS };
    const written = saveRewardUnlock(next);
    if (written.ok) setRewardUnlock(next);
    return written;
  }, []);

  // @AI:NOTE 설정은 데이터가 아니라 사용자 취향이라 남긴다(storage.clearAllData와 동일 범위).
  const clearAll = useCallback(() => {
    try {
      clearAllData();
    } catch {
      // 저장소 접근이 막혀도 메모리 상태는 비운다
    }
    commitRecords([]);
    setLastCalcState(null);
    setRewardUnlock(DEFAULT_REWARD_UNLOCK);
  }, [commitRecords]);

  const value = useMemo<StorageState>(
    () => ({
      ready,
      loadError,
      records,
      settings,
      lastCalc,
      rewardUnlock,
      addRecord,
      deleteRecord,
      updateSettings,
      setLastCalc,
      unlockStats,
      clearAll,
    }),
    [
      ready,
      loadError,
      records,
      settings,
      lastCalc,
      rewardUnlock,
      addRecord,
      deleteRecord,
      updateSettings,
      setLastCalc,
      unlockStats,
      clearAll,
    ]
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageState {
  return useContext(StorageContext);
}
