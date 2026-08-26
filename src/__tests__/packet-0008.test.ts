import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { StorageState } from "@/store/StorageProvider";
import type { CalcInput, CalcResult, LastCalc } from "@/lib/types";

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/store/StorageProvider", () => ({
  useStorage: vi.fn(),
}));

import { useStorage } from "@/store/StorageProvider";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import Home from "@/pages/Home";

const mockUseStorage = vi.mocked(useStorage);

const WEDDING_INPUT: CalcInput = {
  eventType: "wedding",
  relation: "closeFriend",
  intimacy: 4,
  attendance: "attending",
  region: "metropolitan",
};

const WEDDING_RESULT: CalcResult = {
  recommended: 200000,
  min: 150000,
  max: 300000,
  rawAmount: 200000,
  breakdown: [],
  input: WEDDING_INPUT,
};

const LAST_CALC: LastCalc = {
  input: WEDDING_INPUT,
  result: WEDDING_RESULT,
  at: 1735689600000,
};

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

function renderHome() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Home)));
}

// Order matches EVENT_LABEL declaration order in src/lib/constants.ts, and AC-1's
// stated order: 결혼식/장례식/돌잔치/개업식.
const EVENT_TYPES_IN_ORDER = ["wedding", "funeral", "firstBirthday", "opening"];

describe("/ 홈 페이지 (유형 바로가기 + 최근 계산 + 배너)", () => {
  beforeEach(() => {
    mockUseStorage.mockReturnValue(baseState());
  });

  it("AC-1[P0]: renders exactly 4 event-type ListRows and tapping one triggers tickWeak haptic then navigate('/calc', {state:{eventType}}) once", () => {
    renderHome();

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(4);

    fireEvent.click(rows[1]); // 장례식 (funeral) — matches spec's example scenario

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/calc", { state: { eventType: "funeral" } });
  });

  it("AC-1[P0]: each of the 4 ListRows navigates with its own matching eventType", () => {
    EVENT_TYPES_IN_ORDER.forEach((eventType, index) => {
      mockNavigate.mockClear();
      const { unmount } = renderHome();

      const rows = screen.getAllByRole("listitem");
      fireEvent.click(rows[index]);

      expect(mockNavigate).toHaveBeenCalledWith("/calc", { state: { eventType } });
      unmount();
    });
  });

  it("AC-2: shows last-calc-card with the recommended amount + '결혼식 · 친한 친구' caption, and tapping it navigates to /result with input", () => {
    mockUseStorage.mockReturnValue(baseState({ lastCalc: LAST_CALC }));

    renderHome();

    const card = screen.getByTestId("last-calc-card");
    expect(card.textContent).toContain("200,000원");
    expect(card.textContent).toContain("결혼식 · 친한 친구");

    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith("/result", { state: { input: WEDDING_INPUT } });
  });

  it("AC-3: when lastCalc is null, shows the empty state copy and renders no last-calc-card or extra CTA button", () => {
    mockUseStorage.mockReturnValue(baseState({ lastCalc: null }));

    renderHome();

    expect(screen.getByText("첫 계산을 시작해보세요")).toBeInTheDocument();
    expect(screen.queryByTestId("last-calc-card")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("AC-4: when ready is false, shows 4-row skeleton for the type list and 1 skeleton for the hero slot", () => {
    mockUseStorage.mockReturnValue(baseState({ ready: false, lastCalc: null }));

    renderHome();

    const typesLoading = screen.getByTestId("home-types-loading");
    expect(typesLoading.querySelectorAll("[data-skeleton]")).toHaveLength(4);

    const heroLoading = screen.getByTestId("home-hero-loading");
    expect(heroLoading.querySelectorAll("[data-skeleton]")).toHaveLength(1);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("AC-5: AdSlot renders exactly once as the next non-spacing sibling of last-calc-card, without position:fixed or z-index", () => {
    mockUseStorage.mockReturnValue(baseState({ lastCalc: LAST_CALC }));

    const { container } = renderHome();

    const adNodes = container.querySelectorAll("[data-ad-group-id]");
    expect(adNodes).toHaveLength(1);
    const adNode = adNodes[0] as HTMLElement;

    const card = screen.getByTestId("last-calc-card");
    expect(card.parentElement).not.toBeNull();

    // The ad may be wrapped (e.g. an AdSection div) — walk up until we find the
    // ancestor that is an actual sibling of the card in the DOM.
    let adAncestor: HTMLElement | null = adNode;
    while (adAncestor && adAncestor.parentElement !== card.parentElement) {
      adAncestor = adAncestor.parentElement;
    }
    expect(adAncestor).not.toBeNull();

    const siblings = Array.from(card.parentElement!.children);
    const cardIndex = siblings.indexOf(card);
    const adIndex = siblings.indexOf(adAncestor as Element);
    expect(adIndex).toBeGreaterThan(cardIndex);

    // Nothing but decorative Spacing markers may sit between the card and the ad.
    const between = siblings.slice(cardIndex + 1, adIndex);
    for (const el of between) {
      expect(el.hasAttribute("data-spacing")).toBe(true);
    }

    expect((adAncestor as HTMLElement).style.position).not.toBe("fixed");
    expect((adAncestor as HTMLElement).style.zIndex).toBe("");
  });
});
