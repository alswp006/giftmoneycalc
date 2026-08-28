import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { ERROR_MESSAGES } from "@/lib/errors";
import { unlockReward, isRewardUnlocked } from "@/lib/settings";

// mock setup calls MUST run before importing anything that transitively pulls in
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" (both crash in jsdom unmocked).
mockTds();
mockAppsInToss();
mockRouter();

import { RewardGate } from "@/components/RewardGate";
import {
  showFullScreenAd,
  loadFullScreenAd,
  getIsTossLoginIntegratedService,
} from "@apps-in-toss/web-framework";

const DETAIL_TEXT = "이번 달 경조사 지출 128,000원";
const PREVIEW_TEXT = "상세 지출 내역 미리보기";

function renderGate() {
  return renderWithRouter(
    React.createElement(
      RewardGate,
      { lockedPreview: React.createElement("p", null, PREVIEW_TEXT) },
      React.createElement("p", null, DETAIL_TEXT),
    ),
  );
}

// resolves the unlock CTA — its accessible name only needs to mention "광고"
// (the exact copy is the Coder's call, per the 카피 규칙 in CLAUDE.md).
function findUnlockButton() {
  return screen.findByRole("button", { name: /광고/ });
}

describe("결과 상세 리워드 게이트 (TossRewardAd · 24시간 해제)", () => {
  beforeEach(() => {
    // reset to the "inside Toss app, ad SDK healthy" baseline before every test —
    // vitest.setup's afterEach only clears call history, not custom implementations.
    vi.mocked(getIsTossLoginIntegratedService).mockImplementation(async () => false);
    vi.mocked(loadFullScreenAd).mockImplementation((params) => {
      setTimeout(() => params.onEvent({ type: "loaded" } as Parameters<typeof params.onEvent>[0]), 0);
      return () => {};
    });
    vi.mocked(showFullScreenAd).mockImplementation((params) => {
      setTimeout(() => params.onEvent({ type: "rewarded" } as unknown as Parameters<typeof params.onEvent>[0]), 0);
      return () => {};
    });
  });

  it("AC-1[P0]: 잠금 상태(isRewardUnlocked=false)에서는 상세 수치가 DOM에 렌더되지 않는다", () => {
    renderGate();
    expect(screen.queryByText(DETAIL_TEXT)).not.toBeInTheDocument();
    expect(screen.getByText(PREVIEW_TEXT)).toBeInTheDocument();
  });

  it("AC-1[P0]: isRewardUnlocked(now)가 true면 children을 즉시 렌더하고 미리보기는 감춘다", () => {
    unlockReward(Date.now());
    renderGate();
    expect(screen.getByText(DETAIL_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(PREVIEW_TEXT)).not.toBeInTheDocument();
  });

  it("AC-2[P0]: 광고 시청 성공 콜백에서 unlockReward(now)가 호출되고 children이 즉시 렌더된다", async () => {
    renderGate();
    const button = await findUnlockButton();
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(DETAIL_TEXT)).toBeInTheDocument());
    expect(screen.queryByText(PREVIEW_TEXT)).not.toBeInTheDocument();

    const now = Date.now();
    expect(isRewardUnlocked(now)).toBe(true);
    expect(isRewardUnlocked(now + 86400000 + 1)).toBe(false);
  });

  it("AC-2[P0]: SDK 호출이 동기적으로 throw해도(가드 없는 브릿지) 화면이 죽지 않고 잠금 상태를 유지한다", async () => {
    vi.mocked(showFullScreenAd).mockImplementation(() => {
      throw new Error("bridge not available");
    });

    renderGate();
    const button = await findUnlockButton();
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(PREVIEW_TEXT)).toBeInTheDocument());
    expect(screen.queryByText(DETAIL_TEXT)).not.toBeInTheDocument();
    expect(isRewardUnlocked(Date.now())).toBe(false);
  });

  it("AC-3[P0]: 광고 시청 실패(onError) 시 ERROR_MESSAGES[500]을 노출하고 잠금 상태를 유지한다", async () => {
    vi.mocked(showFullScreenAd).mockImplementation((params) => {
      setTimeout(() => params.onError(new Error("ad playback failed")), 0);
      return () => {};
    });

    renderGate();
    const button = await findUnlockButton();
    await waitFor(() => expect(button).toBeEnabled());

    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText(ERROR_MESSAGES[500])).toBeInTheDocument());
    expect(screen.queryByText(DETAIL_TEXT)).not.toBeInTheDocument();
    expect(isRewardUnlocked(Date.now())).toBe(false);
  });

  it("AC-4[P0]: 토스 앱 밖(getIsTossLoginIntegratedService가 throw)에서는 버튼 대신 401 안내 문구를 보여준다", async () => {
    vi.mocked(getIsTossLoginIntegratedService).mockImplementation(() => {
      throw new Error("not in toss webview");
    });

    renderGate();

    await waitFor(() => expect(screen.getByText(ERROR_MESSAGES[401])).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /광고/ })).not.toBeInTheDocument();
    expect(screen.getByText(PREVIEW_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(DETAIL_TEXT)).not.toBeInTheDocument();
  });

  it("AC-4[P0]: getIsTossLoginIntegratedService가 reject되는 경우에도 401 안내로 폴백하며 흰 화면이 되지 않는다", async () => {
    vi.mocked(getIsTossLoginIntegratedService).mockImplementation(() =>
      Promise.reject(new Error("unsupported")),
    );

    renderGate();

    await waitFor(() => expect(screen.getByText(ERROR_MESSAGES[401])).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /광고/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toBe("");
  });

  it("AC-5[P1]: 해제 버튼의 인라인 높이가 48px 이상이다", async () => {
    renderGate();
    const button = await findUnlockButton();

    const minHeight = parseInt(button.style.minHeight || "0", 10);
    expect(button.style.minHeight.endsWith("px")).toBe(true);
    expect(minHeight).toBeGreaterThanOrEqual(48);
  });
});
