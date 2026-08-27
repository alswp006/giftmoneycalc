import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { HistoryRecord } from "@/lib/types";

// ── Component contract (for the Coder implementing src/components/SaveRecordSheet.tsx) ──
//
// type SaveRecordSheetProps = {
//   open: boolean;
//   record: Omit<HistoryRecord, "id" | "createdAt" | "updatedAt" | "amount" | "counterpartLabel" | "memo">;
//   onClose: () => void;
//   onSaved: (recordId: string) => void;
// };
//
// Required data-testid contract (used by these tests to drive the component):
//   - "amount-input"       : TextField for 실제 낸 금액
//   - "counterpart-input"  : TextField for 상대 표기 (max 20 chars, truncate on input)
//   - "memo-input"         : TextField for 메모 (max 100 chars, truncate on input)
//   - "save-button"        : 저장 버튼 (TDS Button)
//
// Validation error message shown via TDS TextField `help`+`hasError` (role="alert"):
//   "1원부터 1,000만 원까지 입력할 수 있어요"
//
// Uses @/state/useRecords → add() to persist. Toast copy (role="status" via mocked TDS Toast):
//   QUOTA_EXCEEDED        → "저장 공간이 부족해요"
//   RECORD_LIMIT_EXCEEDED → "기록은 500개까지 저장할 수 있어요. 오래된 기록을 지워주세요"
//   success               → "기록했어요"
//
// On success: onSaved(recordId) is called with the id returned by add(), then onClose() is called.
// On failure: onSaved/onClose must NOT be called — the sheet stays open so the user can retry.

vi.mock("@toss/tds-mobile", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement("button", { onClick, disabled, ...props }, children),
  TextField: React.forwardRef(({ label, help, hasError, variant, ...props }: any, ref: any) =>
    React.createElement(
      "div",
      null,
      React.createElement("label", null, label),
      React.createElement("input", { ref, "data-variant": variant, ...props }),
      hasError && help ? React.createElement("span", { role: "alert" }, help) : null,
    ),
  ),
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
}));

const mockAdd = vi.fn();
vi.mock("@/state/useRecords", () => ({
  useRecords: () => ({
    records: [],
    add: mockAdd,
    update: vi.fn(),
    remove: vi.fn(),
    reload: vi.fn(),
    lastError: null,
  }),
}));

import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import SaveRecordSheet from "@/components/SaveRecordSheet";

const mockGenerateHaptic = vi.mocked(generateHapticFeedback);

function baseRecord(): Omit<HistoryRecord, "id" | "createdAt" | "updatedAt" | "amount" | "counterpartLabel" | "memo"> {
  return {
    eventType: "WEDDING",
    relation: "FRIEND",
    recommendedAmount: 50000,
    attended: true,
    companions: 0,
    eventDate: "2026-08-28",
    ruleVersion: 1,
  };
}

function renderSheet(overrides: Partial<{ open: boolean; onClose: () => void; onSaved: (id: string) => void }> = {}) {
  const onClose = overrides.onClose ?? vi.fn();
  const onSaved = overrides.onSaved ?? vi.fn();
  render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(SaveRecordSheet, {
        open: overrides.open ?? true,
        record: baseRecord(),
        onClose,
        onSaved,
      }),
    ),
  );
  return { onClose, onSaved };
}

function fillValidAmount() {
  fireEvent.change(screen.getByTestId("amount-input"), { target: { value: "50000" } });
}

describe("기록 저장 BottomSheet 컴포넌트 SaveRecordSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-1[P0]: empty amount disables the save button", () => {
    renderSheet();
    expect((screen.getByTestId("amount-input") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("save-button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("AC-1[P0]: amount over 10,000,000 disables save and shows the exact error message", () => {
    renderSheet();
    fireEvent.change(screen.getByTestId("amount-input"), { target: { value: "10000001" } });

    expect((screen.getByTestId("save-button") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toBe("1원부터 1,000만 원까지 입력할 수 있어요");
  });

  it("AC-2: counterpart label (20자) and memo (100자) are truncated on input", () => {
    renderSheet();
    fireEvent.change(screen.getByTestId("counterpart-input"), {
      target: { value: "abcdefghijklmnopqrstuvwxy" },
    });
    fireEvent.change(screen.getByTestId("memo-input"), { target: { value: "y".repeat(105) } });

    expect((screen.getByTestId("counterpart-input") as HTMLInputElement).value).toBe("abcdefghijklmnopqrst");
    expect((screen.getByTestId("memo-input") as HTMLInputElement).value).toBe("y".repeat(100));
  });

  it("AC-3[P0]: QUOTA_EXCEEDED shows '저장 공간이 부족해요' and does not close or call onSaved", async () => {
    mockAdd.mockResolvedValueOnce({ ok: false, code: "QUOTA_EXCEEDED" });
    const { onClose, onSaved } = renderSheet();
    fillValidAmount();

    await fireEvent.click(screen.getByTestId("save-button"));

    expect((await screen.findByRole("status")).textContent).toBe("저장 공간이 부족해요");
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("AC-3[P0]: RECORD_LIMIT_EXCEEDED shows the 500-limit toast and does not close or call onSaved", async () => {
    mockAdd.mockResolvedValueOnce({ ok: false, code: "RECORD_LIMIT_EXCEEDED" });
    const { onClose, onSaved } = renderSheet();
    fillValidAmount();

    await fireEvent.click(screen.getByTestId("save-button"));

    expect((await screen.findByRole("status")).textContent).toBe(
      "기록은 500개까지 저장할 수 있어요. 오래된 기록을 지워주세요",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: success shows '기록했어요', closes the sheet, and calls onSaved(recordId) exactly once", async () => {
    mockAdd.mockResolvedValueOnce({
      ok: true,
      value: { ...baseRecord(), id: "rec-123", amount: 50000, createdAt: "2026-08-28T00:00:00.000Z", updatedAt: "2026-08-28T00:00:00.000Z" },
    });
    const { onClose, onSaved } = renderSheet();
    fillValidAmount();

    await fireEvent.click(screen.getByTestId("save-button"));

    expect((await screen.findByRole("status")).textContent).toBe("기록했어요");
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith("rec-123");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("AC-5: clicking save triggers generateHapticFeedback({ type: 'success' }) exactly once", async () => {
    mockAdd.mockResolvedValueOnce({
      ok: true,
      value: { ...baseRecord(), id: "rec-456", amount: 50000, createdAt: "2026-08-28T00:00:00.000Z", updatedAt: "2026-08-28T00:00:00.000Z" },
    });
    renderSheet();
    fillValidAmount();

    await fireEvent.click(screen.getByTestId("save-button"));

    expect(mockGenerateHaptic).toHaveBeenCalledTimes(1);
    expect(mockGenerateHaptic).toHaveBeenCalledWith({ type: "success" });
  });
});
