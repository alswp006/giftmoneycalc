import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
import type { CalcInput, CalcResult } from "@/lib/types";

// mockLocation.state is typed `null` by default in the shared helper — widen locally
// so this file can assign the result/null fixtures each AC needs.
const location = mockLocation as { pathname: string; search: string; state: unknown; key: string };

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/store/StorageProvider", () => ({
  useStorage: vi.fn(),
}));

// Spy on the real shareCard functions while keeping their actual behavior — lets AC-1
// verify the exact (canvas, result) args drawShareCard receives, not just the DOM result.
vi.mock("@/lib/shareCard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/shareCard")>();
  return {
    ...actual,
    drawShareCard: vi.fn(actual.drawShareCard),
    buildShareText: vi.fn(actual.buildShareText),
  };
});

import { useStorage } from "@/store/StorageProvider";
import { drawShareCard, buildShareText } from "@/lib/shareCard";
import { setClipboardText } from "@apps-in-toss/web-framework";
import Share from "@/pages/Share";

const mockUseStorage = vi.mocked(useStorage);
const mockDrawShareCard = vi.mocked(drawShareCard);
const mockBuildShareText = vi.mocked(buildShareText);
const mockSetClipboardText = vi.mocked(setClipboardText);

const INPUT: CalcInput = {
  eventType: "wedding",
  relation: "friend",
  intimacy: 3,
  attendance: "attending",
  region: "majorCity",
};
const RESULT: CalcResult = calcGiftAmount(INPUT);

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

function renderShare() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Share)));
}

beforeEach(() => {
  mockUseStorage.mockReset();
  mockNavigate.mockReset();
  mockDrawShareCard.mockClear();
  mockBuildShareText.mockClear();
  mockSetClipboardText.mockReset();
  mockSetClipboardText.mockResolvedValue(undefined);
});

describe("/share 페이지 (카드 미리보기 + 저장 + 문구 복사)", () => {
  it("AC-1[P0]: mount draws the share card at 1080x1080 and displays it at 100% width", () => {
    location.state = { result: RESULT };
    mockUseStorage.mockReturnValue(baseState());

    const { container } = renderShare();

    expect(mockDrawShareCard).toHaveBeenCalledTimes(1);
    const [canvasArg, resultArg] = mockDrawShareCard.mock.calls[0];
    expect(resultArg).toEqual(RESULT);

    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).toBe(canvasArg);
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
    expect(canvas.style.width).toBe("100%");
  });

  it("AC-1[P0]: without a result (redirecting), no canvas is rendered and drawShareCard is not called", () => {
    location.state = null;
    mockUseStorage.mockReturnValue(baseState({ lastCalc: null }));

    const { container } = renderShare();

    expect(container.querySelector("canvas")).toBeNull();
    expect(mockDrawShareCard).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: tapping '이미지 저장' triggers a canvas.toDataURL PNG download and shows the saved toast", () => {
    location.state = { result: RESULT };
    mockUseStorage.mockReturnValue(baseState());
    renderShare();

    const toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,fake");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));

    expect(toDataURLSpy).toHaveBeenCalledWith("image/png");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("이미지를 저장했어요")).toBeInTheDocument();

    toDataURLSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it("AC-3[P0]: tapping '문구 복사' copies buildShareText(result) to the clipboard and shows the copied toast", async () => {
    location.state = { result: RESULT };
    mockUseStorage.mockReturnValue(baseState());
    renderShare();

    fireEvent.click(screen.getByRole("button", { name: "문구 복사" }));

    await vi.waitFor(() => {
      expect(mockSetClipboardText).toHaveBeenCalledTimes(1);
    });

    const expectedText = mockBuildShareText.mock.results.find(
      (r): r is { type: "return"; value: string } => r.type === "return",
    )?.value as string;
    expect(mockSetClipboardText).toHaveBeenCalledWith(expectedText);
    expect(expectedText).toContain("70,000원");

    await vi.waitFor(() => {
      expect(screen.getByText("문구를 복사했어요")).toBeInTheDocument();
    });
  });

  it("AC-3[P0]: clipboard copy failure shows the '복사하지 못했어요' toast", async () => {
    location.state = { result: RESULT };
    mockUseStorage.mockReturnValue(baseState());
    mockSetClipboardText.mockRejectedValue(new Error("clipboard denied"));
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("no clipboard")) },
      configurable: true,
    });

    renderShare();
    fireEvent.click(screen.getByRole("button", { name: "문구 복사" }));

    await vi.waitFor(() => {
      expect(screen.getByText("복사하지 못했어요")).toBeInTheDocument();
    });

    Object.defineProperty(navigator, "clipboard", { value: originalClipboard, configurable: true });
  });

  it("AC-4: the share text and the visible screen never mention a personName, an outbound link, or app-install copy", () => {
    location.state = { result: RESULT };
    mockUseStorage.mockReturnValue(baseState());
    const { container } = renderShare();

    const text = buildShareText(RESULT);
    expect(text).not.toMatch(/https?:\/\//);
    expect(text).not.toMatch(/설치/);
    expect(text.includes("personName")).toBe(false);

    expect(container.textContent).not.toMatch(/https?:\/\//);
    expect(container.textContent).not.toMatch(/앱\s*설치/);
  });

  it("AC-5[P0]: no location.state.result and no lastCalc redirects to /calc (replace) without throwing", () => {
    location.state = null;
    mockUseStorage.mockReturnValue(baseState({ lastCalc: null }));

    expect(() => renderShare()).not.toThrow();

    expect(mockNavigate).toHaveBeenCalledWith("/calc", { replace: true });
  });

  it("AC-5[P0]: missing location.state falls back to lastCalc.result and renders the card instead of redirecting", () => {
    location.state = null;
    mockUseStorage.mockReturnValue(
      baseState({ lastCalc: { input: INPUT, result: RESULT, at: 1000 } }),
    );

    const { container } = renderShare();

    expect(mockNavigate).not.toHaveBeenCalledWith("/calc", { replace: true });
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});
