import { describe, it, expect, vi } from "vitest";
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

// mockLocation.state is typed `null` by default in the shared helper — widen locally
// so this file can assign the prefill/null fixtures each AC needs.
const location = mockLocation as { pathname: string; search: string; state: unknown; key: string };

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/store/StorageProvider", () => ({
  useStorage: vi.fn(),
}));

import { useStorage } from "@/store/StorageProvider";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import RecordNew from "@/pages/RecordNew";
import {
  validatePersonName,
  validateAmount,
  validateDate,
  validateMemo,
} from "@/lib/validation";

const mockUseStorage = vi.mocked(useStorage);
const mockHaptic = vi.mocked(generateHapticFeedback);

function baseState(overrides: Partial<StorageState> = {}): StorageState {
  return {
    ready: true,
    loadError: false,
    records: [],
    settings: { defaultRegion: "majorCity", onboardingDone: true, compactList: false },
    lastCalc: null,
    rewardUnlock: { statsUnlockedUntil: 0 },
    addRecord: vi.fn(() => ({ ok: true as const, id: "rec-1" })),
    deleteRecord: vi.fn(),
    updateSettings: vi.fn(),
    setLastCalc: vi.fn(),
    unlockStats: vi.fn(),
    clearAll: vi.fn(),
    ...overrides,
  };
}

function renderRecordNew() {
  return render(React.createElement(MemoryRouter, null, React.createElement(RecordNew)));
}

// Fills every required field with a valid value (eventType=wedding, relation=friend,
// amount=100000, date=2026-09-12) — direction stays at its 'given' default, memo stays "".
function fillValidForm() {
  fireEvent.change(screen.getByTestId("field-personName"), { target: { value: "김토스" } });
  fireEvent.click(within(screen.getByTestId("group-eventType")).getByRole("button", { name: "결혼식" }));
  fireEvent.click(within(screen.getByTestId("group-relation")).getByRole("button", { name: "친구·지인" }));
  fireEvent.change(screen.getByTestId("field-amount"), { target: { value: "100000" } });
  fireEvent.change(screen.getByTestId("field-date"), { target: { value: "2026-09-12" } });
}

describe("/record/new 페이지 (기록 폼 + 검증 + 저장)", () => {
  it("AC-1[P0]: validation.ts — validatePersonName(1~20자) and validateAmount(1000~10,000,000, 1,000원 단위)", () => {
    expect(validatePersonName("")).toEqual(expect.stringContaining("이름"));
    expect(validatePersonName("a".repeat(21))).toEqual(expect.stringContaining("20"));
    expect(validatePersonName("김토스")).toBeNull();
    expect(validatePersonName("a".repeat(20))).toBeNull();

    expect(validateAmount(500)).toEqual(expect.stringContaining("1,000"));
    expect(validateAmount(10000001)).toEqual(expect.stringContaining("10,000,000"));
    expect(validateAmount(12500)).toEqual(expect.stringContaining("1,000"));
    expect(validateAmount(1000)).toBeNull();
    expect(validateAmount(10000000)).toBeNull();
    expect(validateAmount(100000)).toBeNull();
  });

  it("AC-1[P0]: validation.ts — validateDate('YYYY-MM-DD') and validateMemo(0~50자)", () => {
    expect(validateDate("2026-09-12")).toBeNull();
    expect(validateDate("2026/09/12")).toEqual(expect.any(String));
    expect(validateDate("")).toEqual(expect.any(String));

    expect(validateMemo("")).toBeNull();
    expect(validateMemo("대학 동기")).toBeNull();
    expect(validateMemo("a".repeat(50))).toBeNull();
    expect(validateMemo("a".repeat(51))).toEqual(expect.stringContaining("50"));
  });

  it("AC-1: an invalid personName (21자) puts the TextField in error state with a Korean message", () => {
    location.state = null;
    mockUseStorage.mockReturnValue(baseState());
    renderRecordNew();

    fireEvent.change(screen.getByTestId("field-personName"), { target: { value: "a".repeat(21) } });

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some((el) => /이름|20자/.test(el.textContent ?? ""))).toBe(true);
  });

  it("AC-2[P0]: prefill from /result populates eventType/relation/amount; personName stays empty", () => {
    location.state = { prefill: { eventType: "wedding", relation: "closeFriend", amount: 200000 } };
    mockUseStorage.mockReturnValue(baseState());
    renderRecordNew();

    const amountInput = screen.getByTestId("field-amount") as HTMLInputElement;
    expect(Number(amountInput.value.replace(/,/g, ""))).toBe(200000);

    const weddingChip = within(screen.getByTestId("group-eventType")).getByRole("button", {
      name: "결혼식",
    });
    expect(weddingChip).toHaveAttribute("aria-pressed", "true");

    const closeFriendChip = within(screen.getByTestId("group-relation")).getByRole("button", {
      name: "친한 친구",
    });
    expect(closeFriendChip).toHaveAttribute("aria-pressed", "true");

    const nameInput = screen.getByTestId("field-personName") as HTMLInputElement;
    expect(nameInput.value).toBe("");
  });

  it("AC-2[P0]: without prefill, date defaults to today (YYYY-MM-DD) and direction defaults to 'given'", () => {
    location.state = null;
    mockUseStorage.mockReturnValue(baseState());
    renderRecordNew();

    const dateInput = screen.getByTestId("field-date") as HTMLInputElement;
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const givenChip = within(screen.getByTestId("group-direction")).getByRole("button", {
      name: "내가 줬어요",
    });
    expect(givenChip).toHaveAttribute("aria-pressed", "true");

    const amountInput = screen.getByTestId("field-amount") as HTMLInputElement;
    expect(amountInput.value).toBe("");
  });

  it("AC-3[P0]: SubmitFooter save button is disabled while the form is invalid, and clicking it saves nothing", () => {
    location.state = null;
    const addRecordMock = vi.fn(() => ({ ok: true as const, id: "rec-1" }));
    mockUseStorage.mockReturnValue(baseState({ addRecord: addRecordMock }));
    renderRecordNew();

    const saveButton = screen.getByRole("button", { name: /저장/ });
    expect(saveButton).toBeDisabled();

    fireEvent.click(saveButton);

    expect(addRecordMock).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: valid submit calls addRecord, fires success haptic, shows '기록했어요' toast, navigates to /history (replace)", () => {
    location.state = null;
    const addRecordMock = vi.fn(() => ({ ok: true as const, id: "rec-1" }));
    mockUseStorage.mockReturnValue(baseState({ addRecord: addRecordMock }));
    renderRecordNew();

    fillValidForm();

    const saveButton = screen.getByRole("button", { name: /저장/ });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    expect(addRecordMock).toHaveBeenCalledWith(
      "김토스",
      "wedding",
      "friend",
      100000,
      "2026-09-12",
      "given",
      "",
    );
    expect(mockHaptic).toHaveBeenCalledWith({ type: "success" });
    expect(screen.getByText("기록했어요")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/history", { replace: true });
  });

  it("AC-5[P0]: addRecord failure reasons show the matching toast and never navigate away", () => {
    location.state = null;

    // reason: QUOTA_EXCEEDED
    const quotaMock = vi.fn(() => ({ ok: false as const, reason: "QUOTA_EXCEEDED" as const }));
    mockUseStorage.mockReturnValue(baseState({ addRecord: quotaMock }));
    const first = renderRecordNew();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(screen.getByText("저장 공간이 부족해요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    first.unmount();

    // reason: LIMIT_REACHED
    const limitMock = vi.fn(() => ({ ok: false as const, reason: "LIMIT_REACHED" as const }));
    mockUseStorage.mockReturnValue(baseState({ addRecord: limitMock }));
    renderRecordNew();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(screen.getByText("기록은 1,000건까지 저장할 수 있어요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
