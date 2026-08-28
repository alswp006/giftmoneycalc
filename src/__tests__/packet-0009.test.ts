import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { EVENT_TYPE_LABEL, RELATIONSHIP_LABEL, REGION_LABEL } from "@/lib/rules";
import type { CalcInput } from "@/lib/types";

/**
 * Packet 0009 — 계산 입력 화면 `/calc`
 *
 * TDD Red Phase: src/pages/Calc.tsx does not exist yet — these tests WILL fail.
 *
 * Mock notes (see src/__tests__/__helpers__/mocks.ts):
 * - TDS `ListRow` mock only renders `children` (NOT `contents`/`right` props) — the
 *   region ListRow ("calc-region-row") must render its label via children
 *   (e.g. <ListRow.Texts top="지역" bottom={label} />) for its text to be queryable here.
 * - TDS `Chip` mock always renders as a real <button role="button" aria-pressed=...>.
 * - TDS `FixedBottomCTA` (used inside SubmitFooter) mocks to a plain <button>.
 */

mockTds();
mockAppsInToss();
mockTossRewardAd();

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockGetSettings = vi.fn();
const mockSaveSettings = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSettings: () => mockGetSettings(),
  saveSettings: (partial: unknown) => mockSaveSettings(partial),
}));

import Calc from "@/pages/Calc";

const DEFAULT_SETTINGS = {
  defaultRegion: "seoul" as const,
  inflationAdjustDefault: false,
  rewardUnlockedUntil: null,
};

const SUBMIT_NAME = /계산하기|결과 보기/;

function renderCalc(routerOptions?: Parameters<typeof renderWithRouter>[1]) {
  return renderWithRouter(React.createElement(Calc), routerOptions);
}

function selectRequiredChips() {
  fireEvent.click(screen.getByRole("button", { name: EVENT_TYPE_LABEL.wedding }));
  fireEvent.click(screen.getByRole("button", { name: RELATIONSHIP_LABEL.friends }));
}

describe("계산 입력 화면 `/calc`", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetSettings.mockReset().mockReturnValue({ ...DEFAULT_SETTINGS });
    mockSaveSettings.mockReset();
  });

  it("AC-1[P0]: eventType/relationship 중 하나라도 미선택이면 제출 버튼이 비활성화된다", () => {
    renderCalc();

    expect(screen.getByRole("button", { name: SUBMIT_NAME })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: EVENT_TYPE_LABEL.wedding }));

    // eventType만 선택 — relationship 미선택이라 여전히 비활성
    expect(screen.getByRole("button", { name: SUBMIT_NAME })).toBeDisabled();
  });

  it("AC-1[P0]: eventType과 relationship을 모두 선택하면 제출 버튼이 활성화된다", () => {
    renderCalc();

    selectRequiredChips();

    expect(screen.getByRole("button", { name: SUBMIT_NAME })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: EVENT_TYPE_LABEL.wedding })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("AC-2: location.state.prefill.eventType이 있으면 해당 Chip이 selected=true로 초기 렌더된다", () => {
    renderCalc({
      initialEntries: [
        { pathname: "/calc", state: { prefill: { eventType: "funeral" } } },
      ],
    });

    expect(screen.getByRole("button", { name: EVENT_TYPE_LABEL.funeral })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: EVENT_TYPE_LABEL.wedding })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("AC-3: '지역' ListRow 탭 시 BottomSheet가 열리고 선택 후 닫히며 bottom 텍스트가 갱신된다", () => {
    renderCalc();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("calc-region-row").textContent).toContain(REGION_LABEL.seoul);

    fireEvent.click(screen.getByTestId("calc-region-row"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByText(REGION_LABEL.busan));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("calc-region-row").textContent).toContain(REGION_LABEL.busan);
  });

  it("AC-4: 저장된 defaultRegion이 Region 유니온 밖 값이면 흰 화면 없이 기본 지역으로 대체되고, 사용자가 고른 region은 제출값에 그대로 보존된다", () => {
    mockGetSettings.mockReturnValue({
      defaultRegion: "atlantis",
      inflationAdjustDefault: false,
      rewardUnlockedUntil: null,
    });

    expect(() => renderCalc()).not.toThrow();

    const regionRow = screen.getByTestId("calc-region-row");
    expect(regionRow.textContent).not.toContain("atlantis");
    expect(Object.values(REGION_LABEL).some((label) => regionRow.textContent?.includes(label))).toBe(
      true,
    );

    selectRequiredChips();
    fireEvent.click(regionRow);
    fireEvent.click(screen.getByText(REGION_LABEL.busan));
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_NAME }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [, options] = mockNavigate.mock.calls[0] as [string, { state: { input: CalcInput } }];
    expect(options.state.input.region).toBe("busan");
  });

  it("AC-5[P0]: 제출 시 tickWeak 후 navigate('/result', { state: { input } })가 호출되고 input이 CalcInput 형태와 일치한다", () => {
    renderCalc();

    selectRequiredChips();
    fireEvent.click(screen.getByRole("button", { name: SUBMIT_NAME }));

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    const hapticOrder = vi
      .mocked(generateHapticFeedback)
      .mock.calls.findIndex((call) => call[0]?.type === "tickWeak");
    const navigateOrder = mockNavigate.mock.invocationCallOrder[0];
    const tickWeakOrder = vi.mocked(generateHapticFeedback).mock.invocationCallOrder[hapticOrder];
    expect(tickWeakOrder).toBeLessThan(navigateOrder);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, options] = mockNavigate.mock.calls[0] as [string, { state: { input: CalcInput } }];
    expect(path).toBe("/result");

    const { input } = options.state;
    expect(input.eventType).toBe("wedding");
    expect(input.relationship).toBe("friends");
    expect(typeof input.region).toBe("string");
    expect(typeof input.attend).toBe("boolean");
    expect(typeof input.inflationAdjust).toBe("boolean");
  });
});
