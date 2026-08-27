import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { HistoryRecord } from "@/lib/types";

// ── Component contract (for the Coder implementing src/pages/History.tsx) ──
//
// export default function History(): JSX.Element
//
// - Root wrapped in ScreenScaffold/PageShell (per CLAUDE.md visual skeleton rule).
// - Reads records via `useRecords()` from "@/state/useRecords" → { records }.
//
// Filter (AC-1):
//   - Renders 5 TDS <Chip> filters with EXACT labels: "전체", "결혼식", "장례식", "돌잔치", "개업"
//     (mapping WEDDING/FUNERAL/FIRST_BIRTHDAY/OPENING). Single-select.
//   - Selecting a non-"전체" chip filters the list to that eventType only.
//   - Selecting "전체" clears the filter (shows all records).
//
// Rows (AC-2):
//   - Each visible row is a distinct element carrying data-testid="history-row" (getAllByTestId).
//   - Each row's text content includes the record's date (`eventDate` raw string is acceptable),
//     a type label, a relation label, and the amount formatted as "#,###원"
//     (e.g. 50000 -> "50,000원", via Number.toLocaleString-style grouping).
//   - IF eventType is not one of EVENT_TYPES (WEDDING/FUNERAL/FIRST_BIRTHDAY/OPENING),
//     THEN the row shows "기타" instead of throwing/crashing/blank.
//   - IF relation is not one of RELATIONS, THEN the row also shows "기타" for the relation slot
//     instead of throwing/crashing.
//
// Empty state (AC-3):
//   - WHEN records.length === 0, renders Asset.ContentIcon + text "아직 기록이 없어요"
//     + a Button (or button role) named "계산하러 가기".
//   - Clicking "계산하러 가기" calls navigate("/").
//   - No data-testid="history-row" elements are rendered in this state.
//
// Windowing (AC-4):
//   - WHEN records.length >= 50, the number of data-testid="history-row" elements actually
//     mounted in the DOM at once is <= 50 (client-side windowing / visible-range rendering),
//     even though more records exist in the underlying list.
//
// Row tap (AC-5):
//   - Clicking a row (data-testid="history-row") calls
//     navigate(`/history/${id}`, { state: { from: "list" } }) with that row's record id.

vi.mock("@toss/tds-mobile", () => ({
  Chip: ({ children, selected, onClick }: any) =>
    React.createElement(
      "button",
      { role: "button", "aria-pressed": selected, onClick },
      children,
    ),
  ListRow: Object.assign(
    ({ children, onClick, ...props }: any) =>
      React.createElement("div", { onClick, role: "listitem", ...props }, children),
    {
      Text: ({ children }: any) => React.createElement("span", null, children),
      Texts: ({ top, bottom }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement("span", { "data-slot": "top" }, top),
          React.createElement("span", { "data-slot": "bottom" }, bottom),
        ),
    },
  ),
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),
  Paragraph: {
    Text: ({ children, typography, ...props }: any) =>
      React.createElement("span", { "data-typography": typography, ...props }, children),
  },
  Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),
  Asset: {
    ContentIcon: ({ name, alt }: any) =>
      React.createElement("span", { "data-content-icon": name, role: "img", "aria-label": alt ?? name }),
  },
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockRecordsRef } = vi.hoisted(() => ({
  mockRecordsRef: { current: [] as HistoryRecord[] },
}));
vi.mock("@/state/useRecords", () => ({
  useRecords: () => ({
    records: mockRecordsRef.current,
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reload: vi.fn(),
    lastError: null,
  }),
}));

import History from "@/pages/History";

function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: "rec-1",
    eventType: "WEDDING",
    relation: "FRIEND",
    amount: 50000,
    recommendedAmount: 50000,
    attended: true,
    companions: 0,
    eventDate: "2026-01-15",
    ruleVersion: 1,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}

function renderHistory() {
  return render(React.createElement(MemoryRouter, null, React.createElement(History)));
}

describe("히스토리 목록 화면 `/history`", () => {
  beforeEach(() => {
    mockRecordsRef.current = [];
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: 유형 필터 Chip을 선택하면 해당 유형 기록만 남는다", () => {
    mockRecordsRef.current = [
      makeRecord({ id: "w1", eventType: "WEDDING" }),
      makeRecord({ id: "f1", eventType: "FUNERAL" }),
      makeRecord({ id: "b1", eventType: "FIRST_BIRTHDAY" }),
    ];
    renderHistory();

    expect(screen.getAllByTestId("history-row")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "결혼식" }));

    const rows = screen.getAllByTestId("history-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("50,000원");
  });

  it("AC-1[P0]: '전체' Chip을 선택하면 필터가 해제되어 모든 기록이 다시 표시된다", () => {
    mockRecordsRef.current = [
      makeRecord({ id: "w1", eventType: "WEDDING" }),
      makeRecord({ id: "f1", eventType: "FUNERAL" }),
    ];
    renderHistory();

    fireEvent.click(screen.getByRole("button", { name: "결혼식" }));
    expect(screen.getAllByTestId("history-row")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(screen.getAllByTestId("history-row")).toHaveLength(2);
  });

  it("AC-2[P0]: 행에 날짜·유형·관계·금액(#,###원)이 표시된다", () => {
    mockRecordsRef.current = [
      makeRecord({
        id: "w1",
        eventType: "WEDDING",
        relation: "FRIEND",
        amount: 1234500,
        eventDate: "2026-03-02",
      }),
    ];
    renderHistory();

    const row = screen.getAllByTestId("history-row")[0];
    expect(row.textContent).toContain("2026-03-02");
    expect(row.textContent).toContain("1,234,500원");
    expect(row.textContent).toMatch(/결혼식/);
  });

  it("AC-2[P0]: 유니온 밖 eventType/relation은 '기타'로 표시되고 렌더 예외가 발생하지 않는다", () => {
    mockRecordsRef.current = [
      makeRecord({
        id: "x1",
        eventType: "PROMOTION" as unknown as HistoryRecord["eventType"],
        relation: "???" as unknown as HistoryRecord["relation"],
        amount: 10000,
      }),
    ];

    expect(() => renderHistory()).not.toThrow();

    const row = screen.getAllByTestId("history-row")[0];
    expect(row.textContent).toContain("기타");
    expect(row.textContent).toContain("10,000원");
  });

  it("AC-3[P0]: 기록이 0건이면 빈 상태(아이콘+문구+CTA)가 표시되고 탭 시 '/'로 이동한다", () => {
    mockRecordsRef.current = [];
    renderHistory();

    expect(screen.queryAllByTestId("history-row")).toHaveLength(0);
    expect(screen.getByText("아직 기록이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "계산하러 가기" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-4: 50건 이상일 때 한 번에 렌더되는 행이 50개 이하로 유지된다(윈도잉)", () => {
    mockRecordsRef.current = Array.from({ length: 60 }, (_, i) =>
      makeRecord({ id: `rec-${i}`, eventDate: `2026-01-${String((i % 28) + 1).padStart(2, "0")}` }),
    );
    renderHistory();

    const rows = screen.getAllByTestId("history-row");
    expect(rows.length).toBeLessThanOrEqual(50);
    expect(rows.length).toBeLessThan(60);
  });

  it("AC-5[P0]: 행을 탭하면 navigate(`/history/:id`, { state: { from: 'list' } })가 호출된다", () => {
    mockRecordsRef.current = [makeRecord({ id: "rec-42" })];
    renderHistory();

    fireEvent.click(screen.getAllByTestId("history-row")[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/history/rec-42", { state: { from: "list" } });
  });
});
