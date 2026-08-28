import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { ERROR_MESSAGES } from "@/lib/errors";
import { ok, fail } from "@/lib/errors";
import type { GiftRecord } from "@/lib/types";

// mock setup MUST run before importing anything that transitively pulls in
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" (both crash in jsdom unmocked).
mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/lib/records", () => ({
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
}));

import { RecordSheet } from "@/components/RecordSheet";
import { createRecord, updateRecord } from "@/lib/records";

// Contract (placeholders/labels the Coder must implement exactly — TextField
// variant="box"|"line" hides its floating label on an empty/unfocused input,
// so tests query by placeholder, per CLAUDE.md TextField placeholder rule).
const NAME_PLACEHOLDER = "이름을 입력해 주세요";
const AMOUNT_PLACEHOLDER = "50000";
const DATE_PLACEHOLDER = "20260815";
const SAVE_BUTTON_NAME = /저장/;

const EXISTING_RECORD: GiftRecord = {
  id: "rec-1",
  personName: "김민지",
  eventType: "wedding",
  relationship: "friends",
  eventDate: "2026-03-01",
  amount: 100000,
  memo: "",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText(NAME_PLACEHOLDER), {
    target: { value: "이수민" },
  });
  fireEvent.change(screen.getByPlaceholderText(AMOUNT_PLACEHOLDER), {
    target: { value: "100000" },
  });
  fireEvent.change(screen.getByPlaceholderText(DATE_PLACEHOLDER), {
    target: { value: "20260815" },
  });
}

function renderSheet(props: Partial<React.ComponentProps<typeof RecordSheet>> = {}) {
  return renderWithRouter(
    React.createElement(RecordSheet, {
      open: true,
      mode: "create",
      onClose: vi.fn(),
      onSaved: vi.fn(),
      ...props,
    }),
  );
}

describe("히스토리 추가·수정 BottomSheet (409 중복 확인 다이얼로그)", () => {
  beforeEach(() => {
    vi.mocked(createRecord).mockReset();
    vi.mocked(updateRecord).mockReset();
  });

  it("AC-1[P0]: prefill이 주어지면 금액 필드가 recommendedAmount로 채워진 채 열린다", () => {
    renderSheet({
      mode: "create",
      initial: { eventType: "wedding", relationship: "friends", recommendedAmount: 100000 },
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const amountInput = screen.getByPlaceholderText(AMOUNT_PLACEHOLDER) as HTMLInputElement;
    expect(amountInput.value).toBe("100000");
  });

  it("AC-2[P0]: 금액·날짜 입력은 inputMode=numeric이고, 필수값이 비어 있으면 저장 버튼이 disabled다", () => {
    renderSheet();

    const amountInput = screen.getByPlaceholderText(AMOUNT_PLACEHOLDER);
    const dateInput = screen.getByPlaceholderText(DATE_PLACEHOLDER);
    expect(amountInput.getAttribute("inputMode")).toBe("numeric");
    expect(dateInput.getAttribute("inputMode")).toBe("numeric");

    const saveButton = screen.getByRole("button", { name: SAVE_BUTTON_NAME });
    expect(saveButton).toBeDisabled();

    fillRequiredFields();
    expect(screen.getByRole("button", { name: SAVE_BUTTON_NAME })).toBeEnabled();
  });

  it("AC-2[P1]: 날짜는 8자리 숫자 입력 후 YYYY-MM-DD로 포맷된다", () => {
    renderSheet();

    const dateInput = screen.getByPlaceholderText(DATE_PLACEHOLDER) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "20260815" } });

    expect(dateInput.value).toBe("2026-08-15");
  });

  it("AC-3[P1]: 저장 버튼의 인라인 높이가 52px 이상이며 입력 포커스 후에도 화면에서 사라지지 않는다", () => {
    renderSheet();

    const saveButton = screen.getByRole("button", { name: SAVE_BUTTON_NAME });
    const minHeight = parseInt(saveButton.style.minHeight || "0", 10);
    expect(saveButton.style.minHeight.endsWith("px")).toBe(true);
    expect(minHeight).toBeGreaterThanOrEqual(52);

    fireEvent.focus(screen.getByPlaceholderText(AMOUNT_PLACEHOLDER));

    expect(screen.getByRole("button", { name: SAVE_BUTTON_NAME })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SAVE_BUTTON_NAME }).style.minHeight).toBe(
      saveButton.style.minHeight,
    );
  });

  it("AC-4[P0]: createRecord가 409를 반환하면 확인 다이얼로그가 뜨고, '저장'을 다시 선택하면 force:true로 재시도해 성공한다", async () => {
    const saved: GiftRecord = { ...EXISTING_RECORD, id: "rec-2", personName: "이수민" };
    vi.mocked(createRecord)
      .mockReturnValueOnce(fail(409))
      .mockReturnValueOnce(ok(saved));
    const onSaved = vi.fn();

    renderSheet({ onSaved });
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: SAVE_BUTTON_NAME }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("같은 날짜에 같은 이름의 기록이 이미 있어요");
    expect(dialog).toHaveTextContent("그래도 새 기록으로 저장할까요?");
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /새 기록으로 저장/ }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(createRecord).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createRecord).mock.calls[1][1]).toEqual({ force: true });
  });

  it("AC-4[P0]: 409 확인 다이얼로그에서 '닫기'를 선택하면 시트가 열린 채 입력값이 그대로 남는다", async () => {
    vi.mocked(createRecord).mockReturnValueOnce(fail(409));
    const onClose = vi.fn();

    renderSheet({ onClose });
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: SAVE_BUTTON_NAME }));

    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(createRecord).toHaveBeenCalledTimes(1);
    expect((screen.getByPlaceholderText(NAME_PLACEHOLDER) as HTMLInputElement).value).toBe(
      "이수민",
    );
    expect((screen.getByPlaceholderText(AMOUNT_PLACEHOLDER) as HTMLInputElement).value).toBe(
      "100000",
    );
  });

  it("AC-5[P0]: updateRecord가 409를 반환하면 ERROR_MESSAGES[409] Toast 후 시트가 닫힌다", async () => {
    vi.mocked(updateRecord).mockReturnValueOnce(fail(409));
    const onClose = vi.fn();

    renderSheet({ mode: "edit", initial: EXISTING_RECORD, onClose });
    fireEvent.click(screen.getByRole("button", { name: SAVE_BUTTON_NAME }));

    await waitFor(() =>
      expect(screen.getByText(ERROR_MESSAGES[409])).toBeInTheDocument(),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("AC-5[P0]: 저장 실패(413/507)는 Toast만 뜨고 시트는 열린 채 유지된다", async () => {
    vi.mocked(updateRecord).mockReturnValueOnce(fail(413));
    const onClose = vi.fn();

    renderSheet({ mode: "edit", initial: EXISTING_RECORD, onClose });
    fireEvent.click(screen.getByRole("button", { name: SAVE_BUTTON_NAME }));

    await waitFor(() =>
      expect(screen.getByText(ERROR_MESSAGES[413])).toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
