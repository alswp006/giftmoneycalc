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

import { useStorage } from "@/store/StorageProvider";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import Calc from "@/pages/Calc";

const mockUseStorage = vi.mocked(useStorage);

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

function renderCalc() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Calc)));
}

const EVENT_TYPE_LABELS = ["결혼식", "장례식", "돌잔치", "개업식"];
const RELATION_LABELS = ["가족·친척", "친한 친구", "친구·지인", "직장 동료", "직장 상사", "얼굴만 아는 사이"];
const INTIMACY_LABELS = ["거의 연락 안 함", "가끔 연락", "보통", "자주 만남", "매우 가까움"];
const ATTENDANCE_LABELS = ["참석·식사", "미참석·송금"];
const REGION_LABELS = ["서울 강남권", "서울(그 외)·수도권", "광역시", "그 외 지역"];

describe("/calc 페이지 (선택 폼 + 프리필 + 계산 실행)", () => {
  beforeEach(() => {
    mockUseStorage.mockReturnValue(baseState());
    location.state = null;
  });

  it("AC-1[P0]: renders 5 ChipGroups with the correct option counts, each single-select", () => {
    renderCalc();

    expect(within(screen.getByTestId("group-eventType")).getAllByRole("button")).toHaveLength(4);
    expect(within(screen.getByTestId("group-relation")).getAllByRole("button")).toHaveLength(6);
    expect(within(screen.getByTestId("group-intimacy")).getAllByRole("button")).toHaveLength(5);
    expect(within(screen.getByTestId("group-attendance")).getAllByRole("button")).toHaveLength(2);
    expect(within(screen.getByTestId("group-region")).getAllByRole("button")).toHaveLength(4);
  });

  it("AC-1[P0]: selecting a chip in a group deselects the previously selected chip in that same group", () => {
    renderCalc();

    fireEvent.click(screen.getByRole("button", { name: "가족·친척" }));
    expect(screen.getByRole("button", { name: "가족·친척" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "친한 친구" }));
    expect(screen.getByRole("button", { name: "친한 친구" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "가족·친척" })).toHaveAttribute("aria-pressed", "false");
  });

  it("AC-2: prefills eventType from location.state and region from settings.defaultRegion", () => {
    location.state = { eventType: "wedding" };
    mockUseStorage.mockReturnValue(baseState({ settings: { defaultRegion: "majorCity", onboardingDone: true, compactList: false } }));

    renderCalc();

    expect(screen.getByRole("button", { name: "결혼식" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "광역시" })).toHaveAttribute("aria-pressed", "true");
    // untouched groups remain unselected
    expect(screen.getByRole("button", { name: "가족·친척" })).toHaveAttribute("aria-pressed", "false");
  });

  it("AC-3[P0]: SubmitFooter is disabled until all 5 groups are selected, then enabled", () => {
    location.state = { eventType: "wedding" };
    renderCalc();

    // eventType + region(default) prefilled = only 2 of 5 groups picked
    const submitButton = screen.getByRole("button", { name: "적정 금액 계산하기" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "친한 친구" }));
    fireEvent.click(screen.getByRole("button", { name: "보통" }));
    fireEvent.click(screen.getByRole("button", { name: "참석·식사" }));

    expect(screen.getByRole("button", { name: "적정 금액 계산하기" })).not.toBeDisabled();
  });

  it("AC-4[P0]: submitting fires success haptic, immediately disables, saves lastCalc, and navigates to /result exactly once", () => {
    const setLastCalc = vi.fn();
    mockUseStorage.mockReturnValue(baseState({ setLastCalc }));
    renderCalc();

    fireEvent.click(screen.getByRole("button", { name: "결혼식" }));
    fireEvent.click(screen.getByRole("button", { name: "친한 친구" }));
    fireEvent.click(screen.getByRole("button", { name: "보통" }));
    fireEvent.click(screen.getByRole("button", { name: "참석·식사" }));
    fireEvent.click(screen.getByRole("button", { name: "광역시" }));

    const submitButton = screen.getByRole("button", { name: "적정 금액 계산하기" });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    const expectedInput: CalcInput = {
      eventType: "wedding",
      relation: "closeFriend",
      intimacy: 3,
      attendance: "attending",
      region: "majorCity",
    };
    const expectedResult = calcGiftAmount(expectedInput);

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(submitButton).toBeDisabled();
    expect(setLastCalc).toHaveBeenCalledTimes(1);
    expect(setLastCalc.mock.calls[0][0].input).toEqual(expectedInput);
    expect(setLastCalc.mock.calls[0][0].result).toEqual(expectedResult);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { input: expectedInput } });
  });

  it("AC-5: renders an empty, unselected form without crashing when location.state is missing or malformed, and hides FloatingTabBar", () => {
    location.state = "not-an-object";
    // storage not yet loaded → the settings.defaultRegion prefill effect has not run either,
    // so every group (including region) is genuinely unselected — a true "empty form".
    mockUseStorage.mockReturnValue(baseState({ ready: false }));

    expect(() => renderCalc()).not.toThrow();

    [...EVENT_TYPE_LABELS, ...RELATION_LABELS, ...INTIMACY_LABELS, ...ATTENDANCE_LABELS, ...REGION_LABELS].forEach(
      (label) => {
        expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false");
      },
    );

    expect(screen.getByRole("button", { name: "적정 금액 계산하기" })).toBeDisabled();
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});
