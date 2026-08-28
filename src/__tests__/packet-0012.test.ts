import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { ERROR_MESSAGES } from "@/lib/errors";
import { writeRecords } from "@/lib/storage";
import type { GiftRecord } from "@/lib/types";

// mock setup MUST run before importing anything that transitively pulls in
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" (both crash in jsdom unmocked).
mockAll();

import History from "@/pages/History";

// ── Contract the Coder MUST implement exactly (see .ai-factory/spec.md S4) ──
// - data-testid="history-summary": Card with this month's total amount + record count
// - data-testid="history-tab-sticky": wrapper around the Tab header, style.position === "sticky"
// - data-testid="history-list": the scrollable container holding record ListRows
// - data-testid="history-fab": the 56x56 fixed "기록 추가" button (bottom-right)
// - Each record renders as a TDS ListRow (mocked as role="listitem")
// - ListRow click -> navigate("/history/" + record.id)

function makeRecord(overrides: Partial<GiftRecord>): GiftRecord {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    personName: overrides.personName ?? "김민지",
    eventType: overrides.eventType ?? "wedding",
    relationship: overrides.relationship ?? "friends",
    eventDate: overrides.eventDate ?? "2026-08-01",
    amount: overrides.amount ?? 50000,
    memo: overrides.memo ?? "",
    createdAt: overrides.createdAt ?? 1700000000000,
    updatedAt: overrides.updatedAt ?? 1700000000000,
  };
}

function thisMonthDate(day: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function previousMonthDate(day: string): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = prev.getFullYear();
  const m = String(prev.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function seed(records: GiftRecord[]) {
  writeRecords(records);
}

function renderHistory() {
  return renderWithRouter(React.createElement(History), {
    initialEntries: [{ pathname: "/history", state: null }],
  });
}

describe("히스토리 목록 `/history` — 목록 · 필터 · 416", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  it("AC-1[P0]: 이번 달 총액·건수를 표시하는 요약 Card와 sticky Tab 헤더를 렌더한다", () => {
    seed([
      makeRecord({ id: "r1", personName: "이번달1", eventDate: thisMonthDate("05"), createdAt: 1, amount: 30000 }),
      makeRecord({ id: "r2", personName: "이번달2", eventDate: thisMonthDate("20"), createdAt: 2, amount: 70000 }),
      makeRecord({ id: "r3", personName: "지난달", eventDate: previousMonthDate("10"), createdAt: 3, amount: 999000 }),
    ]);

    renderHistory();

    const summary = screen.getByTestId("history-summary");
    expect(summary.textContent).toMatch(/100,000/);
    expect(summary.textContent).toMatch(/2건/);

    const stickyHeader = screen.getByTestId("history-tab-sticky");
    expect(stickyHeader.style.position).toBe("sticky");
  });

  it("AC-2[P0]: 레코드 101건이면 초기 마운트되는 ListRow가 30개 이하다", () => {
    const records = Array.from({ length: 101 }, (_, i) =>
      makeRecord({
        id: `rec-${i}`,
        personName: `사람${i}`,
        eventDate: `2026-01-${String((i % 27) + 1).padStart(2, "0")}`,
        createdAt: 1700000000000 + i,
      }),
    );
    seed(records);

    renderHistory();

    const rows = screen.getAllByRole("listitem");
    expect(rows.length).toBeLessThanOrEqual(30);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("AC-2[P0]: 스크롤해도 렌더된 개수가 records.length를 넘지 않고, 과도한 역스크롤에도 크래시하지 않는다", () => {
    const records = Array.from({ length: 101 }, (_, i) =>
      makeRecord({
        id: `rec-${i}`,
        personName: `사람${i}`,
        eventDate: `2026-01-${String((i % 27) + 1).padStart(2, "0")}`,
        createdAt: 1700000000000 + i,
      }),
    );
    seed(records);

    renderHistory();
    const initialCount = screen.getAllByRole("listitem").length;

    const container = screen.getByTestId("history-list");
    Object.defineProperty(container, "scrollHeight", { value: 3000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 800, configurable: true });

    for (let i = 0; i < 6; i++) {
      Object.defineProperty(container, "scrollTop", { value: 2200, configurable: true });
      fireEvent.scroll(container);
    }

    const grownCount = screen.getAllByRole("listitem").length;
    expect(grownCount).toBeGreaterThan(initialCount);
    expect(grownCount).toBeLessThanOrEqual(101);

    expect(() => {
      Object.defineProperty(container, "scrollTop", { value: -500, configurable: true });
      fireEvent.scroll(container);
    }).not.toThrow();

    const afterOverscroll = screen.getAllByRole("listitem").length;
    expect(afterOverscroll).toBeGreaterThan(0);
    expect(afterOverscroll).toBeLessThanOrEqual(101);
  });

  it("AC-3[P0]: 목록 끝까지 스크롤하면 마지막 항목 아래에 416 문구가 정확히 1회 표시된다", () => {
    // eventDate strictly increases with i, so queryRecords' descending sort
    // places i=39 first and i=0 (earliest date) last in the rendered list.
    const records = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(2026, 0, 1 + i);
      const eventDate = d.toISOString().slice(0, 10);
      return makeRecord({
        id: `rec-${i}`,
        personName: `사람${i}`,
        eventDate,
        createdAt: 1700000000000 + i,
      });
    });
    seed(records);

    renderHistory();
    const container = screen.getByTestId("history-list");
    Object.defineProperty(container, "scrollHeight", { value: 3000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 800, configurable: true });

    for (let i = 0; i < 10; i++) {
      Object.defineProperty(container, "scrollTop", { value: 2200, configurable: true });
      fireEvent.scroll(container);
    }

    expect(screen.getAllByRole("listitem").length).toBe(40);
    expect(screen.getAllByText(ERROR_MESSAGES[416]).length).toBe(1);

    const lastPersonIndex = container.textContent!.indexOf("사람0");
    const endMessageIndex = container.textContent!.indexOf(ERROR_MESSAGES[416]);
    expect(lastPersonIndex).toBeGreaterThanOrEqual(0);
    expect(endMessageIndex).toBeGreaterThan(lastPersonIndex);
  });

  it("AC-4[P0]: 기록이 0건이면 빈 상태 아이콘과 '아직 기록이 없어요', '기록 추가하기' 버튼이 표시된다", () => {
    renderHistory();

    expect(screen.getByText("아직 기록이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기록 추가하기" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("AC-4[P1]: 필터 결과가 0건이면 '{행사명} 기록이 없어요'가 표시된다", () => {
    seed([makeRecord({ id: "r1", personName: "결혼식만", eventType: "wedding" })]);

    renderHistory();
    fireEvent.click(screen.getByRole("tab", { name: "돌잔치" }));

    expect(screen.getByText("돌잔치 기록이 없어요")).toBeInTheDocument();
    expect(screen.queryByText("결혼식만")).not.toBeInTheDocument();
  });

  it("AC-5[P0]: FAB가 56x56px 우하단 고정이며 FloatingTabBar 위 16px + safe-area 여백을 갖는다", () => {
    renderHistory();

    const fab = screen.getByTestId("history-fab");
    expect(fab.style.width).toBe("56px");
    expect(fab.style.height).toBe("56px");
    expect(fab.style.position).toBe("fixed");
    expect(fab.style.bottom).toMatch(/16/);
    expect(fab.style.bottom).toMatch(/safe-area/);
  });

  it("AC-5[P0]: ListRow를 탭하면 navigate('/history/'+record.id)가 호출된다", () => {
    seed([
      makeRecord({ id: "target-id", personName: "박서준", eventDate: "2026-08-20", createdAt: 5 }),
      makeRecord({ id: "other-id", personName: "김하늘", eventDate: "2026-01-01", createdAt: 1 }),
    ]);

    renderHistory();
    const rows = screen.getAllByRole("listitem");
    fireEvent.click(rows[0]);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/history/target-id");
  });
});
