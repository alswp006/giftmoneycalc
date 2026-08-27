import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Contract (for the Coder implementing the two files below) ──
//
// src/components/shareCardRenderer.ts
//   export type ShareCardData = {
//     amount: number;
//     eventType: string;      // StoredEventType, e.g. "WEDDING"
//     relation?: string;      // StoredRelation — OK to draw (not personal), but not required by tests
//     eventDate: string;      // ISO date "2026-08-28"
//     counterpartLabel?: string; // MUST NEVER be drawn onto the card (privacy)
//     memo?: string;              // MUST NEVER be drawn onto the card (privacy)
//   };
//   export function renderShareCard(canvas: HTMLCanvasElement, data: ShareCardData): boolean;
//     - Sets canvas.width = canvas.height = 1080.
//     - Returns true on success.
//     - Returns false (does NOT throw) when canvas.getContext('2d') is unsupported (returns null).
//     - May throw if a draw call itself fails — callers (ShareCardSheet) must catch AND check the
//       boolean return value.
//     - Draws the amount formatted as "#,###원" (e.g. 1234567 -> "1,234,567원") via ctx.fillText.
//     - Colors: read via `window.getComputedStyle(...)` (TDS tokens) OR use fixed black/white only.
//       NEVER hardcode a brand hex (e.g. #3182F6) into fillStyle/strokeStyle.
//
// src/components/ShareCardSheet.tsx
//   type ShareCardSheetProps = {
//     open: boolean;
//     data: import("@/components/shareCardRenderer").ShareCardData;
//     onClose: () => void;
//   };
//   - Renders a TDS BottomSheet(open) containing a preview <canvas data-testid="share-card-canvas">.
//   - On open, calls renderShareCard(canvasEl, data) exactly once (effect keyed on `open`).
//   - Save button: data-testid="share-save-button" — on click calls canvas.toDataURL('image/png')
//     and triggers a download/share action with that result.
//   - If renderShareCard throws OR returns false: shows a TDS Toast (role="status") with the exact
//     text "공유 카드를 만들지 못했어요", and calls onClose() itself so the sheet closes cleanly
//     (no uncaught exception, no crash).

vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement("button", { onClick, disabled, ...props }, children),
  BottomSheet: Object.assign(
    ({ children, open }: any) => (open ? React.createElement("div", { role: "dialog" }, children) : null),
    { Header: ({ children }: any) => React.createElement("div", null, children) },
  ),
  Toast: ({ open, text, position }: any) =>
    open ? React.createElement("div", { role: "status", "data-position": position }, text) : null,
  Paragraph: {
    Text: ({ children, typography, ...props }: any) =>
      React.createElement("span", { "data-typography": typography, ...props }, children),
  },
  Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
  share: vi.fn(async () => {}),
}));

const mockRenderShareCard = vi.fn(() => true);
vi.mock("@/components/shareCardRenderer", () => ({
  renderShareCard: (...args: unknown[]) => mockRenderShareCard(...args),
}));

import ShareCardSheet from "@/components/ShareCardSheet";
import type { ShareCardData } from "@/components/shareCardRenderer";

function baseShareData(overrides: Partial<ShareCardData> = {}): ShareCardData {
  return {
    amount: 50000,
    eventType: "WEDDING",
    relation: "FRIEND",
    eventDate: "2026-08-28",
    ...overrides,
  };
}

function renderSheet(
  overrides: Partial<{ open: boolean; data: ShareCardData; onClose: () => void }> = {},
) {
  const onClose = overrides.onClose ?? vi.fn();
  render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(ShareCardSheet, {
        open: overrides.open ?? true,
        data: overrides.data ?? baseShareData(),
        onClose,
      }),
    ),
  );
  return { onClose };
}

// ── shareCardRenderer.ts is tested in isolation, unmocked ──
// (must be imported AFTER the vi.mock("@/components/shareCardRenderer") above is hoisted so that
// only THIS describe block uses the real implementation via requireActual)
describe("shareCardRenderer — Canvas 순수 렌더러", () => {
  let renderShareCard: typeof import("@/components/shareCardRenderer").renderShareCard;

  beforeEach(async () => {
    vi.resetModules();
    const actual = await vi.importActual<typeof import("@/components/shareCardRenderer")>(
      "@/components/shareCardRenderer",
    );
    renderShareCard = actual.renderShareCard;
  });

  function makeFakeCtx() {
    const usedColors: string[] = [];
    const fillTextCalls: string[] = [];
    const ctx: any = {
      fillText: vi.fn((text: string) => fillTextCalls.push(text)),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      beginPath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      roundRect: vi.fn(),
      font: "",
      textAlign: "",
      textBaseline: "",
      lineWidth: 0,
      strokeStyle: "",
    };
    Object.defineProperty(ctx, "fillStyle", {
      get() {
        return usedColors[usedColors.length - 1] ?? "";
      },
      set(v: string) {
        usedColors.push(String(v));
      },
    });
    return { ctx, usedColors, fillTextCalls };
  }

  it("AC-1[P0]: draws a 1080x1080 canvas with the amount formatted as #,###원", () => {
    const canvas = document.createElement("canvas");
    const { ctx, fillTextCalls } = makeFakeCtx();
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

    const ok = renderShareCard(canvas, baseShareData({ amount: 1234567 }));

    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
    expect(ok).toBe(true);
    expect(fillTextCalls.some((t) => t.includes("1,234,567원"))).toBe(true);
  });

  it("AC-1[P0]: never draws counterpartLabel or memo even when provided in input data", () => {
    const canvas = document.createElement("canvas");
    const { ctx, fillTextCalls } = makeFakeCtx();
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx);

    renderShareCard(
      canvas,
      baseShareData({ counterpartLabel: "민지", memo: "청첩장 직접 전달" }),
    );

    const allText = fillTextCalls.join(" ");
    expect(allText).not.toContain("민지");
    expect(allText).not.toContain("청첩장 직접 전달");
  });

  it("AC-3: returns false (does not throw) when 2D context is unsupported", () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);

    let ok: boolean | undefined;
    expect(() => {
      ok = renderShareCard(canvas, baseShareData());
    }).not.toThrow();
    expect(ok).toBe(false);
  });

  it("AC-4: never hardcodes a brand HEX color, using getComputedStyle or fixed black/white only", () => {
    const canvas = document.createElement("canvas");
    const { ctx, usedColors } = makeFakeCtx();
    vi.spyOn(canvas, "getContext").mockReturnValue(ctx);
    const getComputedStyleSpy = vi.spyOn(window, "getComputedStyle");

    renderShareCard(canvas, baseShareData());

    const brandHexPattern = /#3182f6/i;
    expect(usedColors.some((c) => brandHexPattern.test(c))).toBe(false);

    const isPureBlackOrWhite = (c: string) => /^#?(000000|000|ffffff|fff)$/i.test(c) || c === "black" || c === "white";
    const onlyBlackWhite = usedColors.length > 0 && usedColors.every(isPureBlackOrWhite);
    expect(onlyBlackWhite || getComputedStyleSpy.mock.calls.length > 0).toBe(true);
  });
});

// ── ShareCardSheet.tsx — orchestration (renderer mocked) ──
describe("ShareCardSheet 오버레이 시트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderShareCard.mockReset();
    mockRenderShareCard.mockReturnValue(true);
  });

  it("AC-2: open 상태에서 미리보기 canvas가 렌더되고 renderShareCard가 호출된다", () => {
    renderSheet({ open: true });

    expect(screen.getByTestId("share-card-canvas")).toBeInTheDocument();
    expect(mockRenderShareCard).toHaveBeenCalledTimes(1);
  });

  it("AC-2[P0]: 저장 버튼 탭 시 canvas.toDataURL('image/png')이 정확히 1회 호출된다", async () => {
    const toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,FAKE");

    renderSheet({ open: true });
    await fireEvent.click(screen.getByTestId("share-save-button"));

    expect(toDataURLSpy).toHaveBeenCalledTimes(1);
    expect(toDataURLSpy).toHaveBeenCalledWith("image/png");
  });

  it("AC-3[P0]: renderShareCard가 예외를 던지면 실패 토스트를 띄우고 onClose를 호출해 시트를 닫는다", async () => {
    mockRenderShareCard.mockImplementationOnce(() => {
      throw new Error("canvas draw failed");
    });
    const { onClose } = renderSheet({ open: true });

    expect((await screen.findByRole("status")).textContent).toBe("공유 카드를 만들지 못했어요");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("AC-3[P0]: renderShareCard가 false를 반환하면(캔버스 미지원) 동일한 실패 토스트를 띄우고 닫는다", async () => {
    mockRenderShareCard.mockImplementationOnce(() => false);
    const { onClose } = renderSheet({ open: true });

    expect((await screen.findByRole("status")).textContent).toBe("공유 카드를 만들지 못했어요");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
