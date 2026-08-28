import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { calculate } from "@/lib/calc";
import { formatNumber } from "@/lib/utils";
import type { CalcInput, CalcResult } from "@/lib/types";

/**
 * Packet 0010 — 결과 화면 `/result` — 기본 레이아웃
 *
 * TDD Red Phase: src/pages/Result.tsx does not exist yet — these tests WILL fail.
 *
 * Mock notes (see src/__tests__/__helpers__/mocks.ts):
 * - TDS `Paragraph.Text` mock renders `data-typography` attribute — used to assert
 *   the result-hero amount uses a t1-or-larger typography.
 * - TDS `FixedBottomCTA` (inside SubmitFooter) mocks to a plain <button> — its own
 *   button element carries the visible label text.
 */

mockTds();
mockAppsInToss();
mockTossRewardAd();

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import Result from "@/pages/Result";

function renderResult(routerOptions?: Parameters<typeof renderWithRouter>[1]) {
  return renderWithRouter(React.createElement(Result), routerOptions);
}

const INPUT: CalcInput = {
  eventType: "wedding",
  relationship: "parents",
  region: "seoul",
  attend: true,
  inflationAdjust: false,
};

// recommendedAmount=550000, rangeMin=440000, rangeMax=660000, reasons.length=3
const EXPECTED_RESULT: CalcResult = calculate(INPUT);

describe("결과 화면 `/result` — 기본 레이아웃", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it("AC-1[P0]: location.state가 null이면 navigate('/', { replace: true })로 리다이렉트하고 흰 화면(크래시) 없이 렌더된다", () => {
    expect(() => renderResult({ initialEntries: ["/result"] })).not.toThrow();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(screen.queryByTestId("result-hero")).not.toBeInTheDocument();
  });

  it("AC-1[P0]: location.state가 있으면 리다이렉트하지 않는다", () => {
    renderResult({
      initialEntries: [{ pathname: "/result", state: { input: INPUT } }],
    });

    expect(mockNavigate).not.toHaveBeenCalledWith("/", { replace: true });
  });

  it("AC-2: result-hero에 recommendedAmount가 t1 이상 타이포로, 그 아래 rangeMin~rangeMax 범위가 표시된다", () => {
    renderResult({
      initialEntries: [{ pathname: "/result", state: { input: INPUT } }],
    });

    const hero = screen.getByTestId("result-hero");
    expect(hero.textContent).toContain(formatNumber(EXPECTED_RESULT.recommendedAmount));
    expect(hero.textContent).toContain(formatNumber(EXPECTED_RESULT.rangeMin));
    expect(hero.textContent).toContain(formatNumber(EXPECTED_RESULT.rangeMax));

    const heroTypographyEl = hero.querySelector('[data-typography="t1"]');
    expect(heroTypographyEl).not.toBeNull();
    expect(heroTypographyEl?.textContent).toContain(formatNumber(EXPECTED_RESULT.recommendedAmount));
  });

  it("AC-3: reasons 배열의 모든 원소(3개 이상)가 각각 한 줄로 렌더된다", () => {
    renderResult({
      initialEntries: [{ pathname: "/result", state: { input: INPUT } }],
    });

    expect(EXPECTED_RESULT.reasons.length).toBeGreaterThanOrEqual(2);
    EXPECTED_RESULT.reasons.forEach((reason) => {
      expect(screen.getByText(reason)).toBeInTheDocument();
    });
  });

  it("AC-4: '기록에 추가하기' 탭 시 navigate('/history', { state: { prefill: { ...input, recommendedAmount } } })가 호출된다", () => {
    renderResult({
      initialEntries: [{ pathname: "/result", state: { input: INPUT } }],
    });

    fireEvent.click(screen.getByRole("button", { name: "기록에 추가하기" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/history", {
      state: {
        prefill: { ...INPUT, recommendedAmount: EXPECTED_RESULT.recommendedAmount },
      },
    });
  });

  it("AC-5: '공유 카드 만들기' 탭 시 navigate('/share', { state: { input, result } })가 호출되고 필드명이 RouteState['/share']와 일치한다", () => {
    renderResult({
      initialEntries: [{ pathname: "/result", state: { input: INPUT } }],
    });

    fireEvent.click(screen.getByRole("button", { name: "공유 카드 만들기" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, options] = mockNavigate.mock.calls[0] as [
      string,
      { state: { input: CalcInput; result: CalcResult } },
    ];
    expect(path).toBe("/share");
    expect(options.state.input).toEqual(INPUT);
    expect(options.state.result).toEqual(EXPECTED_RESULT);
  });
});
