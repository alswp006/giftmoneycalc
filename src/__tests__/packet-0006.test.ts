import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { HistoryRecord, StorageResult } from "@/lib/types";

// Tests are written in TDD-first style (red phase).
// These tests WILL fail until RecordsProvider + useRecords are implemented.

vi.mock("@/storage/records", () => ({
  listRecords: vi.fn(),
  saveRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

import { listRecords, saveRecord, updateRecord, deleteRecord } from "@/storage/records";
import { RecordsProvider } from "@/state/RecordsProvider";
import { useRecords } from "@/state/useRecords";

const mockListRecords = vi.mocked(listRecords);
const mockSaveRecord = vi.mocked(saveRecord);
const mockUpdateRecord = vi.mocked(updateRecord);
const mockDeleteRecord = vi.mocked(deleteRecord);

function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: "rec-a",
    eventType: "WEDDING",
    relation: "FRIEND",
    amount: 50000,
    recommendedAmount: 50000,
    attended: true,
    companions: 0,
    eventDate: "2026-01-01",
    ruleVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(RecordsProvider, null, children);
}

describe("상태 관리 — RecordsProvider + useRecords (낙관적 업데이트·롤백)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-1[P0]: mounts and loads initial records via listRecords() exactly once", async () => {
    const recA = makeRecord({ id: "a", eventDate: "2026-01-01" });
    const recB = makeRecord({ id: "b", eventDate: "2026-02-01" });
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [recA, recB] });

    const { result } = renderHook(() => useRecords(), { wrapper });

    await waitFor(() => expect(result.current.records.length).toBe(2));

    expect(mockListRecords).toHaveBeenCalledTimes(1);
    expect(result.current.records.map((r: HistoryRecord) => r.id)).toEqual(["b", "a"]);
  });

  it("AC-1[P0]: corrupted storage result on mount resolves to an empty array without crashing", async () => {
    mockListRecords.mockResolvedValueOnce({ ok: false, code: "CORRUPTED" });

    const { result } = renderHook(() => useRecords(), { wrapper });

    await waitFor(() => expect(mockListRecords).toHaveBeenCalledTimes(1));

    expect(result.current.records).toEqual([]);
    expect(Array.isArray(result.current.records)).toBe(true);
  });

  it("AC-2: useRecords() returns { records, add, update, remove, reload, lastError }", async () => {
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [] });

    const { result } = renderHook(() => useRecords(), { wrapper });
    await waitFor(() => expect(mockListRecords).toHaveBeenCalledTimes(1));

    expect(Array.isArray(result.current.records)).toBe(true);
    expect(typeof result.current.add).toBe("function");
    expect(typeof result.current.update).toBe("function");
    expect(typeof result.current.remove).toBe("function");
    expect(typeof result.current.reload).toBe("function");
    expect(result.current.lastError).toBeNull();
  });

  it("AC-2: throws an explicit error when useRecords() is called outside RecordsProvider", () => {
    expect(() => renderHook(() => useRecords())).toThrow(/RecordsProvider/i);
  });

  it("AC-3[P0]: add() rolls back to the pre-call array and returns QUOTA_EXCEEDED on failure", async () => {
    const existing = makeRecord({ id: "existing", eventDate: "2026-01-01" });
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [existing] });

    const { result } = renderHook(() => useRecords(), { wrapper });
    await waitFor(() => expect(result.current.records.length).toBe(1));

    mockSaveRecord.mockResolvedValueOnce({ ok: false, code: "QUOTA_EXCEEDED" });

    let addResult: StorageResult<HistoryRecord> | undefined;
    await act(async () => {
      addResult = await result.current.add({
        eventType: "WEDDING",
        relation: "FRIEND",
        amount: 30000,
        recommendedAmount: 30000,
        attended: true,
        companions: 0,
        eventDate: "2026-03-01",
        ruleVersion: 1,
      });
    });

    expect(addResult).toEqual({ ok: false, code: "QUOTA_EXCEEDED" });
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records.map((r: HistoryRecord) => r.id)).toEqual(["existing"]);
  });

  it("AC-3[P0]: update() rolls back the patched record and returns RECORD_LIMIT_EXCEEDED on failure", async () => {
    const existing = makeRecord({ id: "existing", amount: 50000 });
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [existing] });

    const { result } = renderHook(() => useRecords(), { wrapper });
    await waitFor(() => expect(result.current.records.length).toBe(1));

    mockUpdateRecord.mockResolvedValueOnce({ ok: false, code: "RECORD_LIMIT_EXCEEDED" });

    let updateResult: StorageResult<HistoryRecord> | undefined;
    await act(async () => {
      updateResult = await result.current.update("existing", { amount: 99999 });
    });

    expect(updateResult).toEqual({ ok: false, code: "RECORD_LIMIT_EXCEEDED" });
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0].amount).toBe(50000);
  });

  it("AC-3: remove() applies optimistically and stays removed when the storage call succeeds", async () => {
    const existing = makeRecord({ id: "existing" });
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [existing] });

    const { result } = renderHook(() => useRecords(), { wrapper });
    await waitFor(() => expect(result.current.records.length).toBe(1));

    mockDeleteRecord.mockResolvedValueOnce({ ok: true, value: null });

    let removeResult: StorageResult<null> | undefined;
    await act(async () => {
      removeResult = await result.current.remove("existing");
    });

    expect(removeResult).toEqual({ ok: true, value: null });
    expect(result.current.records).toEqual([]);
  });

  it("AC-4: records are sorted by eventDate desc, tie-broken by createdAt desc", async () => {
    const recA = makeRecord({ id: "a", eventDate: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z" });
    const recB = makeRecord({ id: "b", eventDate: "2026-03-01", createdAt: "2026-03-01T00:00:00.000Z" });
    const recC = makeRecord({ id: "c", eventDate: "2026-01-01", createdAt: "2026-01-02T00:00:00.000Z" });
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [recA, recB, recC] });

    const { result } = renderHook(() => useRecords(), { wrapper });
    await waitFor(() => expect(result.current.records.length).toBe(3));

    expect(result.current.records.map((r: HistoryRecord) => r.id)).toEqual(["b", "c", "a"]);
  });
});
