import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import type { StorageState } from "@/store/StorageProvider";
import type { GiftRecord } from "@/lib/types";

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/store/StorageProvider", () => ({
  useStorage: vi.fn(),
}));

import { useStorage } from "@/store/StorageProvider";
import Settings from "@/pages/Settings";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

const mockUseStorage = vi.mocked(useStorage);
const mockGenerateHaptic = vi.mocked(generateHapticFeedback);

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
    updateSettings: vi.fn(() => ({ ok: true as const })),
    setLastCalc: vi.fn(() => ({ ok: true as const })),
    unlockStats: vi.fn(() => ({ ok: true as const })),
    clearAll: vi.fn(),
    ...overrides,
  };
}

function renderSettings() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Settings)));
}

beforeEach(() => {
  mockUseStorage.mockReset();
  mockGenerateHaptic.mockReset();
});

describe("/settings 페이지 (기본 지역 · 목록 밀도 · 데이터 초기화)", () => {
  it("AC-1[P0]: shows 4 default region options and saves selection immediately via updateSettings", () => {
    const updateSettings = vi.fn(() => ({ ok: true as const }));
    mockUseStorage.mockReturnValue(
      baseState({
        settings: { defaultRegion: "majorCity", onboardingDone: true, compactList: false },
        updateSettings,
      }),
    );

    renderSettings();

    const group = screen.getByTestId("group-defaultRegion");
    const options = group.querySelectorAll("button, [role='button']");
    expect(options.length).toBe(4);

    fireEvent.click(screen.getByText("서울 강남권"));

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ defaultRegion: "seoulGangnam" }),
    );
  });

  it("AC-1[P0]: persisted defaultRegion is reflected as selected after re-entry (settings from store)", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        settings: { defaultRegion: "seoulGangnam", onboardingDone: true, compactList: false },
      }),
    );

    renderSettings();

    const selectedChip = screen.getByText("서울 강남권").closest("button");
    expect(selectedChip).not.toBeNull();
    expect(selectedChip?.getAttribute("aria-pressed")).toBe("true");
  });

  it("AC-2: toggling the compact list switch fires tickWeak haptic and saves compactList immediately", () => {
    const updateSettings = vi.fn(() => ({ ok: true as const }));
    mockUseStorage.mockReturnValue(
      baseState({
        settings: { defaultRegion: "majorCity", onboardingDone: true, compactList: false },
        updateSettings,
      }),
    );

    renderSettings();

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(mockGenerateHaptic).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ compactList: true }),
    );
  });

  it("AC-3[P0]: tapping '데이터 초기화' opens an AlertDialog and clearAll only runs after confirming '초기화'", () => {
    const clearAll = vi.fn();
    mockUseStorage.mockReturnValue(
      baseState({
        records: [makeRecord({ id: "r1" }), makeRecord({ id: "r2" })],
        clearAll,
      }),
    );

    renderSettings();

    expect(screen.queryByRole("alertdialog")).toBeNull();

    fireEvent.click(screen.getByText("데이터 초기화"));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(clearAll).not.toHaveBeenCalled();

    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "초기화" });

    fireEvent.click(confirmButton);

    expect(clearAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText("데이터를 초기화했어요")).toBeInTheDocument();
  });

  it("AC-3[P0]: closing the AlertDialog with '닫기' does not run clearAll", () => {
    const clearAll = vi.fn();
    mockUseStorage.mockReturnValue(baseState({ clearAll }));

    renderSettings();

    fireEvent.click(screen.getByText("데이터 초기화"));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(clearAll).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("AC-4: settings (defaultRegion, compactList) remain unchanged after reset — only records/clearAll affected", () => {
    const clearAll = vi.fn();
    const updateSettings = vi.fn(() => ({ ok: true as const }));
    mockUseStorage.mockReturnValue(
      baseState({
        settings: { defaultRegion: "seoulGangnam", onboardingDone: true, compactList: true },
        records: [makeRecord({ id: "r1" })],
        clearAll,
        updateSettings,
      }),
    );

    renderSettings();

    fireEvent.click(screen.getByText("데이터 초기화"));
    fireEvent.click(screen.getByRole("button", { name: "초기화" }));

    expect(clearAll).toHaveBeenCalledTimes(1);
    expect(updateSettings).not.toHaveBeenCalled();

    const selectedChip = screen.getByText("서울 강남권").closest("button");
    expect(selectedChip?.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("switch")).toHaveProperty("checked", true);
  });

  it("AC-5: shows the reference-value guidance notice and has zero external links or install-prompt copy", () => {
    mockUseStorage.mockReturnValue(baseState());

    const { container } = renderSettings();

    expect(screen.getByText(/관례 기준 참고값을 제공하는 계산기예요/)).toBeInTheDocument();
    expect(container.querySelectorAll("a[href^='http']").length).toBe(0);
    expect(container.textContent).not.toMatch(/앱을?\s*설치/);
  });
});
