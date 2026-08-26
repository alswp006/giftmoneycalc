import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, renderHook, act, waitFor } from "@testing-library/react";
import {
  DEFAULT_SETTINGS,
  DEFAULT_REWARD_UNLOCK,
  REWARD_UNLOCK_MS,
  STORAGE_KEYS,
} from "@/lib/constants";
import { StorageProvider, useStorage } from "@/store/StorageProvider";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(StorageProvider, null, children);
}

// Captures every render pass of useStorage() — including the pre-effect
// initial render — so we can assert on transient (ready === false) state
// regardless of how fast effects are flushed by the test renderer.
function Probe({ log }: { log: ReturnType<typeof useStorage>[] }) {
  const state = useStorage();
  log.push(state);
  return null;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("전역 스토리지 상태 StorageProvider + useStorage", () => {
  it("AC-1: useStorage exposes all required fields with correct shapes", async () => {
    const { result } = renderHook(() => useStorage(), { wrapper });

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(typeof result.current.addRecord).toBe("function");
    expect(typeof result.current.deleteRecord).toBe("function");
    expect(typeof result.current.updateSettings).toBe("function");
    expect(typeof result.current.setLastCalc).toBe("function");
    expect(typeof result.current.unlockStats).toBe("function");
    expect(typeof result.current.clearAll).toBe("function");
    expect(Array.isArray(result.current.records)).toBe(true);
    expect(result.current.loadError).toBe(false);
  });

  it("AC-2: returns safe defaults (never undefined) while ready is false", () => {
    const log: ReturnType<typeof useStorage>[] = [];
    render(React.createElement(StorageProvider, null, React.createElement(Probe, { log })));

    const firstPass = log[0];
    expect(firstPass.ready).toBe(false);
    expect(firstPass.records).toEqual([]);
    expect(firstPass.settings).toEqual(DEFAULT_SETTINGS);
    expect(firstPass.lastCalc).toBeNull();
    expect(firstPass.rewardUnlock).toEqual(DEFAULT_REWARD_UNLOCK);
  });

  it("AC-3: load failure sets loadError=true, falls back to defaults, no throw / no console.error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new SyntaxError("Unexpected token in JSON");
    });

    const log: ReturnType<typeof useStorage>[] = [];
    expect(() => {
      render(React.createElement(StorageProvider, null, React.createElement(Probe, { log })));
    }).not.toThrow();

    await waitFor(() => {
      expect(log[log.length - 1].ready).toBe(true);
    });

    const settled = log[log.length - 1];
    expect(settled.loadError).toBe(true);
    expect(settled.records).toEqual([]);
    expect(settled.settings).toEqual(DEFAULT_SETTINGS);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("AC-4: addRecord/deleteRecord update state immediately without re-reading storage", async () => {
    const { result } = renderHook(() => useStorage(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    getItemSpy.mockClear();

    let addResult: { ok: boolean; id?: string; reason?: string } | undefined;
    act(() => {
      addResult = result.current.addRecord(
        "김토스",
        "wedding",
        "friend",
        100000,
        "2026-09-12",
        "given",
        "",
      );
    });

    expect(addResult?.ok).toBe(true);
    expect(result.current.records).toHaveLength(1);
    expect(result.current.records[0].personName).toBe("김토스");
    expect(result.current.records[0].amount).toBe(100000);
    expect(getItemSpy).not.toHaveBeenCalled();

    const newId = result.current.records[0].id;
    act(() => {
      result.current.deleteRecord(newId);
    });
    expect(result.current.records).toHaveLength(0);
    expect(getItemSpy).not.toHaveBeenCalled();
  });

  it("AC-4: updateSettings returns the WriteResult failure as-is on write error, without throwing", async () => {
    const { result } = renderHook(() => useStorage(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    let writeResult: { ok: boolean; reason?: string } | undefined;
    expect(() => {
      act(() => {
        writeResult = result.current.updateSettings({ ...DEFAULT_SETTINGS, compactList: true });
      });
    }).not.toThrow();

    expect(writeResult).toEqual({ ok: false, reason: "QUOTA_EXCEEDED" });
  });

  it("AC-5: unlockStats saves Date.now() + REWARD_UNLOCK_MS and reflects it in rewardUnlock state", async () => {
    const { result } = renderHook(() => useStorage(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    const before = Date.now();
    act(() => {
      result.current.unlockStats();
    });
    const after = Date.now();

    expect(result.current.rewardUnlock.statsUnlockedUntil).toBeGreaterThanOrEqual(
      before + REWARD_UNLOCK_MS,
    );
    expect(result.current.rewardUnlock.statsUnlockedUntil).toBeLessThanOrEqual(
      after + REWARD_UNLOCK_MS,
    );

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.rewardUnlock) ?? "null");
    expect(stored.statsUnlockedUntil).toBe(result.current.rewardUnlock.statsUnlockedUntil);
  });
});
