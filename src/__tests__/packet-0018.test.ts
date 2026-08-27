import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import type { HistoryRecord } from "@/lib/types";

// TDS + SDK + react-router-dom mocks (CLAUDE.md canonical pattern).
// NOTE: mockTossRewardAd() is intentionally NOT used here — this packet tests
// Stats.tsx's own gating decision (RewardGate wiring), so RewardGate is stubbed
// below with a deterministic implementation instead of the real ad flow.
mockTds();
mockAppsInToss();
mockRouter();

// useRecords() mock — mutable fixture so each test controls the record list.
const recordsBox = vi.hoisted(() => ({ current: [] as HistoryRecord[] }));
vi.mock("@/state/useRecords", () => ({
  useRecords: () => ({
    records: recordsBox.current,
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reload: vi.fn(),
    lastError: null,
  }),
}));

// storage/prefs.getReward() mock — controls the persisted reward-unlock timestamp.
const rewardBox = vi.hoisted(() => ({ current: null as number | null }));
vi.mock("@/storage/prefs", () => ({
  getReward: vi.fn(async () => rewardBox.current),
  setRewardUnlockedNow: vi.fn(async () => ({ ok: true, value: null })),
}));

// lib/adConfig.getRewardSlotId() mock — controls whether VITE_TOSS_AD_SLOT_ID is "set".
const slotBox = vi.hoisted(() => ({ current: "reward-slot-stats" as string | null }));
vi.mock("@/lib/adConfig", () => ({
  getAdGroupId: vi.fn(() => null),
  getRewardSlotId: vi.fn(() => slotBox.current),
}));

// StatsDetail — stub out the chart internals (covered by its own component test)
// so this packet only verifies Stats.tsx's composition/gating.
vi.mock("@/components/StatsDetail", () => ({
  StatsDetail: () => React.createElement("div", { "data-testid": "stats-detail-mock" }, "detail"),
}));

// RewardGate — keep the real isRewardUnlocked() export, but replace the
// RewardGate component with a deterministic stub: renders a "locked"
// placeholder whenever it receives a non-empty slotId, otherwise renders
// children directly (mirrors the real component's null-slotId behavior).
vi.mock("@/components/RewardGate", async () => {
  const actual = await vi.importActual<typeof import("@/components/RewardGate")>(
    "@/components/RewardGate",
  );
  return {
    ...actual,
    RewardGate: ({ slotId, children }: { slotId: string | null; children?: React.ReactNode }) =>
      slotId
        ? React.createElement("div", { "data-testid": "reward-gate-locked" }, "광고 보고 확인하기")
        : React.createElement(React.Fragment, null, children),
  };
});

import Stats from "@/pages/Stats";

const records: HistoryRecord[] = [
  {
    id: "r1",
    eventType: "WEDDING",
    relation: "FRIEND",
    amount: 50000,
    recommendedAmount: 50000,
    attended: true,
    companions: 0,
    eventDate: "2026-01-10",
    ruleVersion: 1,
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "r2",
    eventType: "FUNERAL",
    relation: "FAMILY",
    amount: 100000,
    recommendedAmount: 100000,
    attended: true,
    companions: 0,
    eventDate: "2026-02-10",
    ruleVersion: 1,
    createdAt: "2026-02-10T00:00:00.000Z",
    updatedAt: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "r3",
    eventType: "OPENING",
    relation: "COWORKER",
    amount: 150000,
    recommendedAmount: 150000,
    attended: true,
    companions: 0,
    eventDate: "2026-03-10",
    ruleVersion: 1,
    createdAt: "2026-03-10T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
  },
];
// totalAmount = 300000, totalCount = 3, avgAmount = 100000 (evenly divisible —
// unambiguous whether the coder rounds/ceils)

function renderStats() {
  return render(React.createElement(MemoryRouter, { initialEntries: ["/stats"] }, React.createElement(Stats)));
}

describe("통계 화면 조립 `/stats`", () => {
  beforeEach(() => {
    recordsBox.current = records;
    rewardBox.current = null;
    slotBox.current = "reward-slot-stats";
    mockNavigate.mockReset();
    mockLocation.pathname = "/stats";
  });

  it("AC-1[P0]: 기록이 있으면 요약 카드에 총 지출·기록 수·평균 금액이 #,###원 포맷으로 표시된다", () => {
    renderStats();

    expect(screen.getByTestId("stats-total-amount").textContent).toContain("300,000");
    expect(screen.getByTestId("stats-total-count").textContent).toContain("3");
    expect(screen.getByTestId("stats-avg-amount").textContent).toContain("100,000");
    expect(document.body.textContent ?? "").not.toContain("undefined");
  });

  it("AC-1[P0]: 기록이 0건이면 요약 카드 대신 빈 상태(아이콘 + 안내 + '계산하러 가기' 버튼)만 렌더된다", () => {
    recordsBox.current = [];
    renderStats();

    const empty = screen.getByTestId("stats-empty");
    expect(empty.textContent).toContain("아직 통계를 만들 기록이 없어요");
    expect(screen.queryByTestId("stats-total-amount")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stats-detail-mock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reward-gate-locked")).not.toBeInTheDocument();

    screen.getByRole("button", { name: "계산하러 가기" }).click();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-2: 해제 전(잠금)에는 상세 차트 영역이 RewardGate로 감싸져 StatsDetail 내용이 DOM에 노출되지 않는다", async () => {
    // rewardBox.current === null (never unlocked), slotId is set → locked gate expected
    renderStats();

    await waitFor(() => {
      expect(screen.getByTestId("reward-gate-locked")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("stats-detail-mock")).not.toBeInTheDocument();
    // summary card still renders alongside the gated detail area
    expect(screen.getByTestId("stats-total-amount").textContent).toContain("300,000");
  });

  it("AC-3: 리워드 slotId env가 비어 있으면 게이트 없이 StatsDetail이 바로 표시되고 화면 나머지가 정상 동작한다", async () => {
    slotBox.current = null;
    renderStats();

    await waitFor(() => {
      expect(screen.getByTestId("stats-detail-mock")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("reward-gate-locked")).not.toBeInTheDocument();
    expect(screen.getByTestId("stats-total-amount").textContent).toContain("300,000");
  });

  it("AC-4: 저장된 해제 시각이 미래면 잠금 상태로 표시되어 다시 광고 시청을 요구한다", async () => {
    rewardBox.current = Date.now() + 10 * 60 * 1000; // 10분 뒤 (미래)
    renderStats();

    await waitFor(() => {
      expect(screen.getByTestId("reward-gate-locked")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("stats-detail-mock")).not.toBeInTheDocument();
  });

  it("AC-4: 저장된 해제 시각이 NaN이면 잠금 상태로 표시되어 다시 광고 시청을 요구한다", async () => {
    rewardBox.current = NaN;
    renderStats();

    await waitFor(() => {
      expect(screen.getByTestId("reward-gate-locked")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("stats-detail-mock")).not.toBeInTheDocument();
  });

  it("AC-5: 하단 FloatingTabBar가 active='stats'로 표시되고 콘텐츠가 탭바에 가리지 않는다", () => {
    renderStats();

    const statsTab = screen.getByRole("tab", { name: "통계" });
    expect(statsTab).toHaveAttribute("aria-selected", "true");
    const homeTab = screen.getByRole("tab", { name: "홈" });
    expect(homeTab).toHaveAttribute("aria-selected", "false");

    // Bottom clearance so content isn't clipped by the fixed tab bar
    const spacers = Array.from(document.querySelectorAll("[data-spacing]")) as HTMLElement[];
    const maxSpacing = Math.max(0, ...spacers.map((el) => Number(el.dataset.spacing) || 0));
    expect(maxSpacing).toBeGreaterThanOrEqual(64);
  });
});
