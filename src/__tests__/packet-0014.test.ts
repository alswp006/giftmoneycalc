import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { ERROR_MESSAGES } from "@/lib/errors";
import { ok, fail } from "@/lib/errors";
import type { GiftRecord } from "@/lib/types";

// mock setup MUST run before importing anything that transitively pulls in
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" (both crash in jsdom unmocked).
mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/lib/records", () => ({
  queryRecords: vi.fn(),
  deleteRecord: vi.fn(),
  updateRecord: vi.fn(),
}));

// RecordSheet is a heavy dependency already covered by its own packet's tests
// (packet-0013). Stub it here so HistoryDetail tests focus on its own contract:
// what mode/initial it opens the sheet with, and what it does on onSaved/onClose.
vi.mock("@/components/RecordSheet", () => ({
  RecordSheet: ({ open, mode, initial, onClose, onSaved }: any) => {
    if (!open) return null;
    return React.createElement(
      "div",
      {
        "data-testid": "record-sheet",
        "data-mode": mode,
        "data-initial-id": initial?.id ?? "",
        "data-initial-amount": String(initial?.amount ?? ""),
      },
      React.createElement("button", { onClick: onClose }, "시트 닫기"),
      React.createElement(
        "button",
        {
          onClick: () =>
            onSaved({
              ...initial,
              amount: 250000,
              updatedAt: (initial?.updatedAt ?? 0) + 1,
            }),
        },
        "시트 저장",
      ),
    );
  },
}));

import HistoryDetail from "@/pages/HistoryDetail";
import { queryRecords, deleteRecord } from "@/lib/records";

const EXISTING_RECORD: GiftRecord = {
  id: "rec-1",
  personName: "김민지",
  eventType: "wedding",
  relationship: "friends",
  eventDate: "2026-03-01",
  amount: 100000,
  memo: "축의금 봉투 전달",
  createdAt: new Date("2026-01-10T00:00:00+09:00").getTime(),
  updatedAt: new Date("2026-01-10T00:00:00+09:00").getTime(),
};

function renderDetail(id: string) {
  return renderWithRouter(
    React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: "/history/:id", element: React.createElement(HistoryDetail) }),
    ),
    { initialEntries: [`/history/${id}`] },
  );
}

describe("히스토리 상세 `/history/:id` (404 · 수정 · 삭제)", () => {
  beforeEach(() => {
    vi.mocked(queryRecords).mockReset();
    vi.mocked(deleteRecord).mockReset();
    mockNavigate.mockReset();
  });

  it("AC-1[P0]: 레코드가 있으면 record-detail-card에 금액(t3)과 상세 6행이 렌더된다", () => {
    vi.mocked(queryRecords).mockReturnValue([EXISTING_RECORD]);

    renderDetail("rec-1");

    const card = screen.getByTestId("record-detail-card");
    expect(card).toBeInTheDocument();

    const amountEl = card.querySelector('[data-typography="t3"]');
    expect(amountEl).not.toBeNull();
    expect(amountEl?.textContent).toContain("100,000");

    const rows = within(card).getAllByRole("listitem");
    expect(rows.length).toBe(6);

    expect(card).toHaveTextContent("김민지");
    expect(card).toHaveTextContent("결혼식");
    expect(card).toHaveTextContent("친구");
    expect(card).toHaveTextContent("2026-03-01");
    expect(card).toHaveTextContent("축의금 봉투 전달");
    expect(card).toHaveTextContent("기록일");
  });

  it("AC-2[P0]: 없는 id면 ERROR_MESSAGES[404]와 '목록으로' 버튼만 보이고 흰 화면이 아니다", () => {
    vi.mocked(queryRecords).mockReturnValue([EXISTING_RECORD]);

    renderDetail("no-such-id");

    expect(screen.getByText(ERROR_MESSAGES[404])).toBeInTheDocument();
    expect(screen.queryByTestId("record-detail-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /삭제/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toBe("");

    const backButton = screen.getByRole("button", { name: "목록으로" });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/history");
  });

  it("AC-3[P0]: '수정하기' 탭 시 RecordSheet가 edit 모드로 rec-1 값을 들고 열리고, 저장하면 화면 금액이 즉시 갱신된다", () => {
    vi.mocked(queryRecords).mockReturnValue([EXISTING_RECORD]);

    renderDetail("rec-1");

    const editButton = screen.getByRole("button", { name: /수정하기/ });
    fireEvent.click(editButton);

    const sheet = screen.getByTestId("record-sheet");
    expect(sheet.getAttribute("data-mode")).toBe("edit");
    expect(sheet.getAttribute("data-initial-id")).toBe("rec-1");
    expect(sheet.getAttribute("data-initial-amount")).toBe("100000");

    fireEvent.click(screen.getByRole("button", { name: "시트 저장" }));

    const card = screen.getByTestId("record-detail-card");
    expect(card).toHaveTextContent("250,000");
    expect(screen.queryByTestId("record-sheet")).not.toBeInTheDocument();
  });

  it("AC-4[P0]: 시트가 닫힐 때 레코드가 여전히 있으면(409 충돌 후) 최신값으로 재조회해 표시한다", () => {
    vi.mocked(queryRecords).mockReturnValue([EXISTING_RECORD]);
    renderDetail("rec-1");

    fireEvent.click(screen.getByRole("button", { name: /수정하기/ }));
    expect(screen.getByTestId("record-sheet")).toBeInTheDocument();

    // 다른 화면에서 먼저 저장되어 값이 바뀐 상태를 시뮬레이션 (409로 시트가 닫힐 때 상황)
    const conflictedRecord: GiftRecord = { ...EXISTING_RECORD, amount: 777000, updatedAt: EXISTING_RECORD.updatedAt + 1 };
    vi.mocked(queryRecords).mockReturnValue([conflictedRecord]);

    fireEvent.click(screen.getByRole("button", { name: "시트 닫기" }));

    expect(screen.queryByTestId("record-sheet")).not.toBeInTheDocument();
    const card = screen.getByTestId("record-detail-card");
    expect(card).toHaveTextContent("777,000");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: 시트가 닫힐 때 레코드가 이미 삭제되어 없으면 ERROR_MESSAGES[404] 후 navigate('/history', {replace:true})", () => {
    vi.mocked(queryRecords).mockReturnValue([EXISTING_RECORD]);
    renderDetail("rec-1");

    fireEvent.click(screen.getByRole("button", { name: /수정하기/ }));

    // 다른 화면에서 이미 삭제된 상태를 시뮬레이션
    vi.mocked(queryRecords).mockReturnValue([]);

    fireEvent.click(screen.getByRole("button", { name: "시트 닫기" }));

    expect(screen.getByText(ERROR_MESSAGES[404])).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith("/history", { replace: true });
  });

  it("AC-5[P0]: '삭제' 확인(AlertDialog, 왼쪽 버튼 '닫기') 시 deleteRecord 후 navigate('/history', {replace:true})되고 모든 버튼이 48px 이상이다", async () => {
    vi.mocked(queryRecords).mockReturnValue([EXISTING_RECORD]);
    vi.mocked(deleteRecord).mockReturnValue(ok(undefined));

    renderDetail("rec-1");

    const editButton = screen.getByRole("button", { name: /수정하기/ });
    const deleteButton = screen.getByRole("button", { name: "삭제" });

    fireEvent.click(deleteButton);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeInTheDocument();

    const confirmButton = within(dialog).getByRole("button", { name: /삭제/ });
    fireEvent.click(confirmButton);

    expect(deleteRecord).toHaveBeenCalledWith("rec-1");
    expect(mockNavigate).toHaveBeenCalledWith("/history", { replace: true });

    for (const btn of [editButton, deleteButton, confirmButton]) {
      const minHeight = parseInt(btn.style.minHeight || "0", 10);
      expect(btn.style.minHeight.endsWith("px")).toBe(true);
      expect(minHeight).toBeGreaterThanOrEqual(48);
    }
  });

  it("AC-5[P1]: deleteRecord가 404를 반환해도 흰 화면 없이 ERROR_MESSAGES[404]를 보여준다", async () => {
    vi.mocked(queryRecords).mockReturnValue([EXISTING_RECORD]);
    vi.mocked(deleteRecord).mockReturnValue(fail(404));

    renderDetail("rec-1");
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /삭제/ }));

    expect(screen.getByText(ERROR_MESSAGES[404])).toBeInTheDocument();
    expect(document.body.textContent).not.toBe("");
  });
});
