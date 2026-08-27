import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { HistoryRecord, StorageResult } from "@/lib/types";
import { listRecords, saveRecord, updateRecord as updateRecordStorage, deleteRecord } from "@/storage/records";
import { newUuid } from "@/storage/uuid";

type SaveRecordInput = Omit<HistoryRecord, "id" | "createdAt" | "updatedAt">;
type UpdateRecordPatch = Partial<Omit<HistoryRecord, "id" | "createdAt">>;
type RecordsErrorCode = Exclude<StorageResult<unknown>, { ok: true }>["code"];

export type RecordsContextValue = {
  records: HistoryRecord[];
  add: (input: SaveRecordInput) => Promise<StorageResult<HistoryRecord>>;
  update: (id: string, patch: UpdateRecordPatch) => Promise<StorageResult<HistoryRecord>>;
  remove: (id: string) => Promise<StorageResult<null>>;
  reload: () => Promise<void>;
  lastError: RecordsErrorCode | null;
};

export const RecordsContext = createContext<RecordsContextValue | null>(null);

function sortRecords(records: HistoryRecord[]): HistoryRecord[] {
  return [...records].sort((a, b) => {
    if (a.eventDate !== b.eventDate) return a.eventDate < b.eventDate ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [lastError, setLastError] = useState<RecordsErrorCode | null>(null);
  const recordsRef = useRef<HistoryRecord[]>(records);
  recordsRef.current = records;

  const reload = useCallback(async () => {
    const result = await listRecords();
    setRecords(result.ok ? sortRecords(result.value) : []);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(async (input: SaveRecordInput): Promise<StorageResult<HistoryRecord>> => {
    const prev = recordsRef.current;
    const now = new Date().toISOString();
    const optimistic: HistoryRecord = { ...input, id: `optimistic-${newUuid()}`, createdAt: now, updatedAt: now };
    setRecords(sortRecords([...prev, optimistic]));

    const result = await saveRecord(input);
    if (!result.ok) {
      setRecords(prev);
      setLastError(result.code);
      return result;
    }
    setRecords(sortRecords([...prev, result.value]));
    setLastError(null);
    return result;
  }, []);

  const update = useCallback(async (id: string, patch: UpdateRecordPatch): Promise<StorageResult<HistoryRecord>> => {
    const prev = recordsRef.current;
    const optimistic = prev.map((r) =>
      r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
    );
    setRecords(sortRecords(optimistic));

    const result = await updateRecordStorage(id, patch);
    if (!result.ok) {
      setRecords(prev);
      setLastError(result.code);
      return result;
    }
    setRecords(sortRecords(prev.map((r) => (r.id === id ? result.value : r))));
    setLastError(null);
    return result;
  }, []);

  const remove = useCallback(async (id: string): Promise<StorageResult<null>> => {
    const prev = recordsRef.current;
    setRecords(prev.filter((r) => r.id !== id));

    const result = await deleteRecord(id);
    if (!result.ok) {
      setRecords(prev);
      setLastError(result.code);
      return result;
    }
    setLastError(null);
    return result;
  }, []);

  const value: RecordsContextValue = { records, add, update, remove, reload, lastError };

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}
