import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  mockTds,
  mockAppsInToss,
  mockRouter,
  mockNavigate,
  mockLocation,
} from "@/__tests__/__helpers__/mocks";
import type { StorageState } from "@/store/StorageProvider";
import { calcGiftAmount } from "@/lib/calc";
import { EVENT_LABEL, RELATION_LABEL, ATTENDANCE_LABEL } from "@/lib/constants";
import type { CalcInput } from "@/lib/types";

// mockLocation.state is typed as `null` in the shared helper (its default value) —
// widen locally so this file can assign arbitrary location.state fixtures.
const location = mockLocation as { pathname: string; search: string; state: unknown; key: string };

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/store/StorageProvider", () => ({
  useStorage: vi.fn(),
}));

// Spy on CountUp while keeping its real rendering behavior — lets AC-1 verify the
// exact (value, durationMs, typography) props Result passes it, not just the final text.
vi.mock("@/components/CountUp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/CountUp")>();
  return { ...actual, CountUp: vi.fn(actual.CountUp) };
});

import { useStorage } from "@/store/StorageProvider";
import { CountUp } from "@/components/CountUp";
import Result from "@/pages/Result";

const mockUseStorage = vi.mocked(useStorage);
const mockCountUp = vi.mocked(CountUp);

function baseState(overrides: Partial<StorageState> = {}): StorageState {
  return {
    ready: true,
    loadError: false,
    records: [],
    settings: { defaultRegion: "majorCity", onboardingDone: true, compactList: false },
    lastCalc: null,
    rewardUnlock: { statsUnlockedUntil: 0 },
    addRecord: vi.fn(),
    deleteRecord: vi.fn(),
    updateSettings: vi.fn(),
    setLastCalc: vi.fn(),
    unlockStats: vi.fn(),
    clearAll: vi.fn(),
    ...overrides,
  };
}

function renderResult() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Result)));
}

const testInput: CalcInput = {
  eventType: "wedding",
  relation: "closeFriend",
  intimacy: 3,
  attendance: "attending",
  region: "majorCity",
};
const testResult = calcGiftAmount(testInput);
// Sanity-check the fixture itself so failures below point at Result.tsx, not this file.
// recommended 150,000원 (base 50,000 × relation 2.0 × intimacy 1.0 × attendance 1.6 × region 1.0 → 160,000, snapped to ladder)
// range 100,000원 ~ 200,000원 (ladder neighbors of 150,000)
if (testResult.recommended !== 150000 || testResult.min !== 100000 || testResult.max !== 200000) {
  throw new Error("fixture assumption changed — update packet-0010.test.ts expected values");
}

describe("/result 페이지 (추천 금액 + 근거 + 액션 분기)", () => {
  beforeEach(() => {
    mockUseStorage.mockReturnValue(baseState());
    location.state = { input: testInput };
  });

  it("AC-1[P0]: recommend-hero shows the recommended amount via CountUp(typography=t1, durationMs=600) and 3 caption Chips for type/relation/attendance", () => {
    renderResult();

    const hero = screen.getByTestId("recommend-hero");
    expect(hero).toBeInTheDocument();

    expect(mockCountUp).toHaveBeenCalledWith(
      expect.objectContaining({ value: 150000, typography: "t1", durationMs: 600 }),
      expect.anything(),
    );

    const chips = within(hero).getAllByRole("button");
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.textContent)).toEqual([
      EVENT_LABEL.wedding,
      RELATION_LABEL.closeFriend,
      ATTENDANCE_LABEL.attending,
    ]);
  });

  it("AC-2[P0]: range-card shows the '적정 범위' label and the min~max range in formatKRW form", () => {
    renderResult();

    const card = within(screen.getByTestId("range-card"));
    expect(card.getByText("적정 범위")).toBeInTheDocument();
    expect(card.getByText((_, node) => node?.textContent === "100,000원 ~ 200,000원")).toBeInTheDocument();
  });

  it("AC-3: breakdown 항목 5개가 기본 금액→관계→친밀도→참석→지역 순서로 표시되고 각 행에 계수 값이 노출된다", () => {
    renderResult();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(5);

    testResult.breakdown.forEach((item, i) => {
      const rowText = rows[i].getAttribute("aria-label") ?? rows[i].textContent ?? "";
      expect(rowText).toEqual(expect.stringContaining(item.label));
      expect(rowText).toEqual(expect.stringContaining(String(item.factor)));
    });
  });

  it("AC-4: always shows the reference-value disclaimer and never shows an AI-generated-result notice", () => {
    renderResult();

    expect(
      screen.getByText("관례 기준 참고값입니다. 실제 금액은 개인 상황에 따라 달라질 수 있어요."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/AI가 생성한/)).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("AC-5[P0]: '이 금액으로 기록하기' navigates to /record/new with a matching prefill", () => {
    renderResult();

    fireEvent.click(screen.getByRole("button", { name: "이 금액으로 기록하기" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/record/new", {
      state: {
        prefill: {
          eventType: "wedding",
          relation: "closeFriend",
          amount: 150000,
        },
      },
    });
  });

  it("AC-5[P0]: '공유 카드 만들기' navigates to /share with the full CalcResult", () => {
    renderResult();

    fireEvent.click(screen.getByRole("button", { name: "공유 카드 만들기" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/share", { state: { result: testResult } });
  });

  it("AC-5[P0]: falls back to lastCalc.input when location.state is missing, and redirects to /calc (replace) when both are missing", () => {
    mockUseStorage.mockReturnValue(baseState({ lastCalc: { input: testInput, result: testResult, at: 0 } }));
    location.state = null;

    renderResult();

    // fallback: renders using lastCalc, no redirect
    expect(screen.getByTestId("recommend-hero")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-5[P0]: redirects to /calc (replace) when location.state and lastCalc are both missing", () => {
    mockUseStorage.mockReturnValue(baseState({ lastCalc: null }));
    location.state = null;

    renderResult();

    expect(mockNavigate).toHaveBeenCalledWith("/calc", { replace: true });
  });
});
