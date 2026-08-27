import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { HistoryRecord } from "@/lib/types";

vi.mock("@/storage/records", () => ({
  listRecords: vi.fn(),
  saveRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

import { listRecords, saveRecord } from "@/storage/records";
import { RecordsProvider } from "@/state/RecordsProvider";
import { useRecords } from "@/state/useRecords";

const mockListRecords = vi.mocked(listRecords);
const mockSaveRecord = vi.mocked(saveRecord);

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

describe("useRecords — reload() and lastError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reload() re-fetches records on demand and applies the sort order", async () => {
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [] });
    const { result } = renderHook(() => useRecords(), { wrapper });
    await waitFor(() => expect(mockListRecords).toHaveBeenCalledTimes(1));

    const fresh = makeRecord({ id: "fresh" });
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [fresh] });

    await act(async () => {
      await result.current.reload();
    });

    expect(mockListRecords).toHaveBeenCalledTimes(2);
    expect(result.current.records.map((r) => r.id)).toEqual(["fresh"]);
  });

  it("lastError is set after a failed add() and cleared after a subsequent successful add()", async () => {
    mockListRecords.mockResolvedValueOnce({ ok: true, value: [] });
    const { result } = renderHook(() => useRecords(), { wrapper });
    await waitFor(() => expect(mockListRecords).toHaveBeenCalledTimes(1));
    expect(result.current.lastError).toBeNull();

    mockSaveRecord.mockResolvedValueOnce({ ok: false, code: "QUOTA_EXCEEDED" });
    const input = {
      eventType: "WEDDING" as const,
      relation: "FRIEND" as const,
      amount: 30000,
      recommendedAmount: 30000,
      attended: true,
      companions: 0,
      eventDate: "2026-03-01",
      ruleVersion: 1,
    };
    await act(async () => {
      await result.current.add(input);
    });
    expect(result.current.lastError).toBe("QUOTA_EXCEEDED");

    mockSaveRecord.mockResolvedValueOnce({ ok: true, value: makeRecord({ id: "saved", ...input }) });
    await act(async () => {
      await result.current.add(input);
    });
    expect(result.current.lastError).toBeNull();
  });
});
