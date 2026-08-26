import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockRouter } from "@/__tests__/__helpers__/mocks";
import type { StorageState } from "@/store/StorageProvider";
import type { EventType, GiftRecord } from "@/lib/types";
import { REWARD_UNLOCK_MS } from "@/lib/constants";

mockTds();
mockRouter();

vi.mock("@/store/StorageProvider", () => ({
  useStorage: vi.fn(),
}));

// RewardGate's own ad-watching mechanics (TossRewardAd/SDK wiring) are already
// covered by packet-0017 — here it's stubbed as a plain controlled gate so this
// packet's tests focus on Stats page/hook wiring: does it pass the right
// `unlocked` value, and does watching the ad actually unlock the report.
vi.mock("@/components/RewardGate", () => ({
  RewardGate: ({
    unlocked,
    onUnlocked,
    children,
    buttonText,
  }: {
    unlocked: boolean;
    onUnlocked: () => void;
    children: React.ReactNode;
    buttonText?: string;
  }) =>
    unlocked
      ? children
      : React.createElement(
          "button",
          { onClick: onUnlocked },
          buttonText ?? "광고 보고 리포트 열기",
        ),
}));

import { useStorage } from "@/store/StorageProvider";
import Stats from "@/pages/Stats";
import { StatsDetail } from "@/components/StatsDetail";
import { useStatsUnlock } from "@/hooks/useStatsUnlock";

const mockUseStorage = vi.mocked(useStorage);

function makeRecord(overrides: Partial<GiftRecord> & { id: string }): GiftRecord {
  return {
    personName: "김민서",
    eventType: "wedding",
    relation: "friend",
    amount: 100000,
    date: "2026-08-01",
    direction: "given",
    memo: "",
    createdAt: 1000,
    ...overrides,
  };
}

function baseState(overrides: Partial<StorageState> = {}): StorageState {
  return {
    ready: true,
    loadError: false,
    records: [],
    settings: { defaultRegion: "majorCity", onboardingDone: true, compactList: false },
    lastCalc: null,
    rewardUnlock: { statsUnlockedUntil: 0 },
    addRecord: vi.fn(() => ({ ok: true as const, id: "rec-1" })),
    deleteRecord: vi.fn(() => ({ ok: true as const })),
    updateSettings: vi.fn(),
    setLastCalc: vi.fn(),
    unlockStats: vi.fn(),
    clearAll: vi.fn(),
    ...overrides,
  };
}

function renderStats() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Stats)));
}

beforeEach(() => {
  mockUseStorage.mockReset();
});

describe("/stats 페이지 (무료 요약 + 건수 게이트 + 리워드 게이트)", () => {
  it("AC-1[P0]: free summary (total given, total received, record count) shows even when locked and below the record threshold", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [makeRecord({ id: "r1", amount: 100000, direction: "given" })],
        rewardUnlock: { statsUnlockedUntil: 0 },
      }),
    );

    renderStats();

    const hero = screen.getByTestId("stats-hero");
    expect(hero.textContent).toContain("100,000원");
    expect(hero.textContent).toContain("1건");
    expect(screen.queryByTestId("stats-detail")).toBeNull();
  });

  it("AC-1[P0]: free summary still shows totals when enough records exist but the reward gate is locked", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [
          makeRecord({ id: "r1", amount: 100000, direction: "given" }),
          makeRecord({ id: "r2", amount: 200000, direction: "given" }),
          makeRecord({ id: "r3", amount: 50000, direction: "received" }),
        ],
        rewardUnlock: { statsUnlockedUntil: 0 },
      }),
    );

    renderStats();

    const hero = screen.getByTestId("stats-hero");
    expect(hero.textContent).toContain("300,000원");
    expect(hero.textContent).toContain("3건");
  });

  it("AC-2[P0]: fewer than MIN_STATS_RECORDS(3) records shows the threshold guidance instead of the detail report or reward button", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [
          makeRecord({ id: "r1" }),
          makeRecord({ id: "r2" }),
        ],
        rewardUnlock: { statsUnlockedUntil: 0 },
      }),
    );

    renderStats();

    expect(
      screen.getByText("기록이 3건 이상 쌓이면 상세 리포트를 볼 수 있어요"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("stats-detail")).toBeNull();
    expect(screen.queryByRole("button", { name: "광고 보고 리포트 열기" })).toBeNull();
  });

  it("AC-3[P0]: 3+ records with an expired/unset statsUnlockedUntil hides the detail and shows the reward button", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [makeRecord({ id: "r1" }), makeRecord({ id: "r2" }), makeRecord({ id: "r3" })],
        rewardUnlock: { statsUnlockedUntil: Date.now() - 1000 },
      }),
    );

    renderStats();

    expect(screen.queryByTestId("stats-detail")).toBeNull();
    expect(screen.getByRole("button", { name: "광고 보고 리포트 열기" })).toBeInTheDocument();
    expect(
      screen.queryByText("기록이 3건 이상 쌓이면 상세 리포트를 볼 수 있어요"),
    ).toBeNull();
  });

  it("AC-4[P0]: watching the reward ad calls unlockStats and immediately renders the detail report", () => {
    let currentRewardUnlock = { statsUnlockedUntil: 0 };
    const unlockStatsMock = vi.fn(() => {
      currentRewardUnlock = { statsUnlockedUntil: Date.now() + REWARD_UNLOCK_MS };
      return { ok: true as const };
    });
    mockUseStorage.mockImplementation(() =>
      baseState({
        records: [makeRecord({ id: "r1" }), makeRecord({ id: "r2" }), makeRecord({ id: "r3" })],
        rewardUnlock: currentRewardUnlock,
        unlockStats: unlockStatsMock,
      }),
    );

    const { rerender } = renderStats();

    expect(screen.queryByTestId("stats-detail")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "광고 보고 리포트 열기" }));

    expect(unlockStatsMock).toHaveBeenCalledTimes(1);
    expect(currentRewardUnlock.statsUnlockedUntil).toBeGreaterThan(Date.now());

    rerender(React.createElement(MemoryRouter, null, React.createElement(Stats)));
    expect(screen.getByTestId("stats-detail")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "광고 보고 리포트 열기" })).toBeNull();
  });

  it("AC-4[P0]: re-entering within 24h of unlocking shows the detail directly without the reward button", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [makeRecord({ id: "r1" }), makeRecord({ id: "r2" }), makeRecord({ id: "r3" })],
        rewardUnlock: { statsUnlockedUntil: Date.now() + REWARD_UNLOCK_MS - 1000 },
      }),
    );

    renderStats();

    expect(screen.getByTestId("stats-detail")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "광고 보고 리포트 열기" })).toBeNull();
  });

  it("AC-5[P0]: useStatsUnlock derives `unlocked` from statsUnlockedUntil alone, independent of records.length", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [],
        rewardUnlock: { statsUnlockedUntil: Date.now() + REWARD_UNLOCK_MS },
      }),
    );

    const { result } = renderHook(() => useStatsUnlock());
    expect(result.current.unlocked).toBe(true);
    expect(typeof result.current.unlockStats).toBe("function");

    mockUseStorage.mockReturnValue(
      baseState({
        records: [makeRecord({ id: "r1" }), makeRecord({ id: "r2" }), makeRecord({ id: "r3" })],
        rewardUnlock: { statsUnlockedUntil: 0 },
      }),
    );

    const { result: lockedResult } = renderHook(() => useStatsUnlock());
    expect(lockedResult.current.unlocked).toBe(false);
  });

  it("AC-5[P0]: StatsDetail renders one progress bar per event type and a trend sparkline for 2+ months", () => {
    const byEventType: Record<EventType, number> = {
      wedding: 300000,
      funeral: 50000,
      firstBirthday: 0,
      opening: 0,
    };
    const byMonth = { "2026-06": 100000, "2026-07": 150000, "2026-08": 100000 };

    render(
      React.createElement(StatsDetail, {
        byEventType,
        byMonth,
        averageAmount: 116666,
      }),
    );

    expect(screen.getAllByRole("progressbar").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId("stats-trend")).toBeInTheDocument();
    expect(screen.getByText("116,666원")).toBeInTheDocument();
  });
});
