import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { ERROR_MESSAGES } from "@/lib/errors";
import { unlockReward, isRewardUnlocked } from "@/lib/settings";
import type { StatsSummary } from "@/lib/types";

// mock setup MUST run before importing anything that transitively pulls in
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" (both crash in jsdom unmocked).
mockTds();
mockAppsInToss();
mockRouter();

import { StatsDetail } from "@/components/StatsDetail";
import {
  showFullScreenAd,
  loadFullScreenAd,
  getIsTossLoginIntegratedService,
} from "@apps-in-toss/web-framework";

const SUMMARY: StatsSummary = {
  totalAmount: 384000,
  count: 3,
  avgAmount: 128000,
  byEventType: [{ type: "wedding", amount: 384000, ratio: 1 }],
  monthlyTrend: [
    { month: "2026-06", amount: 100000 },
    { month: "2026-07", amount: 140000 },
    { month: "2026-08", amount: 144000 },
  ],
  topRelationship: "friends",
};

const SHORT_TREND_SUMMARY: StatsSummary = {
  ...SUMMARY,
  monthlyTrend: [{ month: "2026-08", amount: 50000 }],
};

function renderDetail(summary: StatsSummary = SUMMARY) {
  return renderWithRouter(React.createElement(StatsDetail, { summary }));
}

function findUnlockButton() {
  return screen.findByRole("button", { name: /광고/ });
}

describe("통계 상세 시각화 + 리워드 게이트 + 401", () => {
  beforeEach(() => {
    // baseline: inside Toss app, ad SDK healthy — vitest.setup's afterEach only
    // clears call history, not custom mock implementations set inside a test.
    vi.mocked(getIsTossLoginIntegratedService).mockImplementation(async () => false);
    vi.mocked(loadFullScreenAd).mockImplementation((params) => {
      setTimeout(() => params.onEvent({ type: "loaded" } as Parameters<typeof params.onEvent>[0]), 0);
      return () => {};
    });
    vi.mocked(showFullScreenAd).mockImplementation((params) => {
      setTimeout(
        () => params.onEvent({ type: "rewarded" } as unknown as Parameters<typeof params.onEvent>[0]),
        0,
      );
      return () => {};
    });
  });

  it("AC-1[P0]: 리워드 해제 상태에서 trend-sparkline과 detail-stats를 각 1개씩 렌더한다", () => {
    unlockReward(Date.now());
    renderDetail();

    expect(screen.getAllByTestId("trend-sparkline")).toHaveLength(1);
    expect(screen.getAllByTestId("detail-stats")).toHaveLength(1);
    expect(screen.getByText(/128,000/)).toBeInTheDocument();
  });

  it("AC-2[P0]: 잠금 상태에서는 블러 미리보기만 보이고 detail-stats 내부 수치 텍스트가 DOM에 없다", () => {
    renderDetail();

    expect(screen.queryByTestId("detail-stats")).not.toBeInTheDocument();
    expect(screen.queryByText(/128,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/384,000/)).not.toBeInTheDocument();
  });

  it("AC-3[P0]: 리워드 시청 성공 후 24시간 내 재진입해도 잠금 없이 detail-stats가 즉시 렌더된다", async () => {
    renderDetail();
    const button = await findUnlockButton();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByTestId("detail-stats")).toBeInTheDocument());

    const unlockedAt = Date.now();
    expect(isRewardUnlocked(unlockedAt + 3600_000)).toBe(true); // 1시간 후도 해제 유지
    expect(isRewardUnlocked(unlockedAt + 86400_000 + 1)).toBe(false); // 24시간 경과 시 재잠금

    // 재진입(리마운트) — 24시간 내이므로 다시 광고를 볼 필요 없이 즉시 렌더
    const { unmount } = renderDetail();
    expect(screen.getAllByTestId("detail-stats").length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it("AC-4[P0]: 광고 실패 시 ERROR_MESSAGES[500] 토스트가 뜨고 잠금이 유지된다", async () => {
    vi.mocked(showFullScreenAd).mockImplementation((params) => {
      setTimeout(() => params.onError(new Error("ad playback failed")), 0);
      return () => {};
    });

    renderDetail();
    const button = await findUnlockButton();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(ERROR_MESSAGES[500])).toBeInTheDocument());
    expect(screen.queryByTestId("detail-stats")).not.toBeInTheDocument();
    expect(isRewardUnlocked(Date.now())).toBe(false);
  });

  it("AC-4[P0]: 토스 앱 밖에서는 해제 버튼 대신 ERROR_MESSAGES[401] 문구가 표시된다", async () => {
    vi.mocked(getIsTossLoginIntegratedService).mockImplementation(() => {
      throw new Error("not in toss webview");
    });

    renderDetail();

    await waitFor(() => expect(screen.getByText(ERROR_MESSAGES[401])).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /광고/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("detail-stats")).not.toBeInTheDocument();
  });

  it("AC-5[P1]: monthlyTrend가 1개월치뿐이어도 throw 없이 렌더되고 화면이 비지 않는다", () => {
    unlockReward(Date.now());

    expect(() => renderDetail(SHORT_TREND_SUMMARY)).not.toThrow();
    expect(screen.getByTestId("detail-stats")).toBeInTheDocument();
    expect(document.body.textContent).not.toBe("");
  });
});
