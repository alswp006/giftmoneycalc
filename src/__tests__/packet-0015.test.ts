import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, act, fireEvent } from "@testing-library/react";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { GiftRecord } from "@/lib/types";

// mock setup MUST run before importing anything that transitively pulls in
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" (both crash in jsdom unmocked).
mockAll();

// Contract (Coder implements exactly):
// - Stats reuses the existing `@/hooks/useRecords` hook (records/loading/reload via
//   subscribeRecords) — same pattern as History.tsx. We wrap it in vi.fn(actual) so most
//   tests exercise the REAL hook (real cross-tab subscribeRecords behavior), while the
//   AC-4 loading test overrides the return value for a single render.
// - Top: SummaryHero (총 지출, CountUp) built from aggregate(records, Date.now()).totalAmount.
// - Two (or more) elements carrying data-testid="stat-card": summary indicators (avg/count/
//   top relationship) + event-type ratio (MiniBar per byEventType entry).
// - Empty (0 records): EmptyState(icon=Asset.ContentIcon, title='기록이 없어 통계를 만들 수 없어요',
//   action=Button('기록 추가하러 가기') -> navigate('/history', { state: { prefill: null } })).
// - AdSlot placed between summary cards and detail section; only renders
//   [data-ad-group-id] when import.meta.env.VITE_TOSS_AD_GROUP_ID is non-empty.
// - Tab-root screen: bottom slot is FloatingTabBar only — no SubmitFooter/fixed CTA.
vi.mock("@/hooks/useRecords", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useRecords")>("@/hooks/useRecords");
  return { useRecords: vi.fn(actual.useRecords) };
});

import { useRecords } from "@/hooks/useRecords";
import Stats from "@/pages/Stats";

const RECORD_1: GiftRecord = {
  id: "r-1",
  personName: "김민지",
  eventType: "wedding",
  relationship: "friends",
  eventDate: "2026-08-05",
  amount: 100000,
  memo: "",
  createdAt: 1,
  updatedAt: 1,
};

const RECORD_2: GiftRecord = {
  id: "r-2",
  personName: "박서준",
  eventType: "wedding",
  relationship: "friends",
  eventDate: "2026-07-20",
  amount: 150000,
  memo: "",
  createdAt: 2,
  updatedAt: 2,
};

const RECORD_3: GiftRecord = {
  id: "r-3",
  personName: "이수민",
  eventType: "funeral",
  relationship: "colleagues",
  eventDate: "2026-06-01",
  amount: 80000,
  memo: "",
  createdAt: 3,
  updatedAt: 3,
};

function seedRecords(records: GiftRecord[]) {
  seedLocalStorage({ "gmc:records": records });
}

function renderStats() {
  return renderWithRouter(React.createElement(Stats));
}

describe("통계 `/stats` — 요약 영역", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC-1[P0]: 총 지출을 CountUp으로 표시하고 stat-card가 2개 이상 렌더된다", () => {
    seedRecords([RECORD_1, RECORD_2, RECORD_3]);

    renderStats();

    // 100,000 + 150,000 + 80,000 = 330,000
    expect(document.body.textContent).toContain("330,000");
    expect(screen.getAllByTestId("stat-card").length).toBeGreaterThanOrEqual(2);
  });

  it("AC-1[P1]: 요약 카드 중 하나는 행사 유형별 비중 MiniBar(progressbar)를 포함한다", () => {
    seedRecords([RECORD_1, RECORD_2, RECORD_3]);

    renderStats();

    expect(screen.getAllByRole("progressbar").length).toBeGreaterThanOrEqual(1);
  });

  it("AC-2[P0]: 기록 0건이면 안내 문구와 '기록 추가하러 가기' 버튼이 뜬다", () => {
    seedRecords([]);

    renderStats();

    expect(screen.getByText("기록이 없어 통계를 만들 수 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기록 추가하러 가기" })).toBeInTheDocument();
    expect(screen.queryAllByTestId("stat-card")).toHaveLength(0);
  });

  it("AC-2[P0]: '기록 추가하러 가기' 탭 시 navigate('/history', { state: { prefill: null } })가 호출된다", () => {
    seedRecords([]);

    renderStats();
    fireEvent.click(screen.getByRole("button", { name: "기록 추가하러 가기" }));

    expect(mockNavigate).toHaveBeenCalledWith("/history", { state: { prefill: null } });
  });

  it("AC-3[P0]: 다른 탭에서 기록이 추가되면 subscribeRecords 콜백으로 총액이 자동 갱신된다", () => {
    seedRecords([RECORD_1]);

    renderStats();
    expect(document.body.textContent).toContain("100,000");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "gmc:records",
          newValue: JSON.stringify([RECORD_1, RECORD_2]),
        }),
      );
    });

    // 100,000 + 150,000 = 250,000 — 재계산된 총액이 화면에 반영돼야 한다.
    expect(document.body.textContent).toContain("250,000");
    expect(document.body.textContent).not.toContain("100,000원");
  });

  it("AC-4[P0]: 로딩 중에는 히어로 스켈레톤 1개 + 카드 스켈레톤 2개(총 3개)가 렌더되고 stat-card는 없다", () => {
    vi.mocked(useRecords).mockReturnValueOnce({ records: [], loading: true, reload: vi.fn() });

    renderStats();

    expect(screen.getAllByRole("presentation")).toHaveLength(3);
    expect(screen.queryAllByTestId("stat-card")).toHaveLength(0);
  });

  it("AC-4[P1]: VITE_TOSS_AD_GROUP_ID가 빈 값이면 AdSlot이 아무것도 렌더하지 않는다", () => {
    seedRecords([RECORD_1, RECORD_2, RECORD_3]);

    const { container } = renderStats();

    expect(container.querySelector("[data-ad-group-id]")).toBeNull();
    // 광고 슬롯이 비어도 나머지 골격(총액)은 정상 렌더돼야 한다.
    expect(document.body.textContent).toContain("330,000");
  });

  it("AC-5[P1]: 탭-루트 화면이라 FloatingTabBar 외에 하단 고정 CTA가 없다", () => {
    seedRecords([RECORD_1, RECORD_2, RECORD_3]);

    const { container } = renderStats();

    expect(screen.getByRole("tablist", { name: "메인 네비게이션" })).toBeInTheDocument();
    const fixedElements = container.querySelectorAll(
      '[style*="position: fixed"], [style*="position:fixed"]',
    );
    // FloatingTabBar 자신의 <nav>만 fixed여야 한다 — SubmitFooter 등 추가 고정 CTA 없음.
    expect(fixedElements.length).toBe(1);
  });
});
