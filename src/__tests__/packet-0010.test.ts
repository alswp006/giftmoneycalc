import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AggregateResult } from "@/domain/aggregate";

// ── Contract (for the Coder implementing the file below) ──
//
// src/components/StatsDetail.tsx
//   export type StatsDetailProps = {
//     data: AggregateResult; // { totalCount, totalAmount, avgAmount, byEventType, monthly } — from "@/domain/aggregate"
//     eventTypeLabels?: Record<string, string>; // optional label map; falls back to the raw key when missing/absent
//   };
//   export function StatsDetail({ data, eventTypeLabels }: StatsDetailProps): JSX.Element
//
//   - Root: some wrapper element with data-testid="stats-detail".
//   - 유형별 막대 목록: Object.entries(data.byEventType)를 sum 내림차순 정렬해 렌더.
//     각 행은 data-testid="stats-type-row" (여러 개 — getAllByTestId로 조회).
//       - 라벨: eventTypeLabels?.[type] ?? type (원문 텍스트 그대로 행 안에 표시)
//       - 금액: "#,###원" 포맷 (예: 6000000 -> "6,000,000원") — Number.toLocaleString 계열
//       - 비율: Math.round(sum / totalAmount * 100) + "%" (totalAmount === 0이면 0%, NaN/Infinity 금지)
//       - 막대: src/components/MiniBar의 <MiniBar ratio={totalAmount === 0 ? 0 : sum/totalAmount} />를
//         사용 (role="progressbar", 퍼센트 기반 width — 고정 px 금지)
//   - 월별 추이: data.monthly를 ym 오름차순으로 가정하고 마지막 6개 구간만 사용.
//       - 구간이 2개 이상이면 src/components/Sparkline의 <Sparkline data={...} testId="stats-trend" />를 사용.
//       - 구간이 정확히 1개면 Sparkline(내부에서 data.length<2 시 null 반환)에 위임하지 말고,
//         StatsDetail이 직접 점 1개(예: <circle> 또는 동등한 단일 마커)를 data-testid="stats-trend"로 렌더
//         (예외 없이 렌더되어야 함).
//   - 외부 차트 라이브러리(recharts/chart.js/d3/victory/nivo 등) import 금지, HEX 색상 하드코딩 금지
//     (var(--tds-color-*) / var(--adaptive*)만), 막대 폭은 고정 px가 아닌 퍼센트 기반.

vi.mock("@toss/tds-mobile", () => ({
  Paragraph: {
    Text: ({ children, typography, ...props }: any) =>
      React.createElement("span", { "data-typography": typography, ...props }, children),
  },
  Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),
}));

vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

function makeAggregate(overrides: Partial<AggregateResult>): AggregateResult {
  return {
    totalCount: 0,
    totalAmount: 0,
    avgAmount: 0,
    byEventType: {},
    monthly: [],
    ...overrides,
  };
}

describe("통계 상세 차트 컴포넌트 StatsDetail (MiniBar · Sparkline)", () => {
  it("AC-1[P0]: 유형별 막대가 합계 내림차순으로 정렬되고 유형명·금액·비율이 표시된다", async () => {
    const { StatsDetail } = await import("@/components/StatsDetail");
    const data = makeAggregate({
      totalCount: 8,
      totalAmount: 10000000,
      avgAmount: 1250000,
      byEventType: {
        WEDDING: { count: 5, sum: 3000000 },
        FUNERAL: { count: 2, sum: 1000000 },
        FIRST_BIRTHDAY: { count: 1, sum: 6000000 },
      },
      monthly: [{ ym: "2026-08", sum: 10000000 }],
    });
    const labels = { WEDDING: "결혼식", FUNERAL: "장례식", FIRST_BIRTHDAY: "돌잔치" };

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(StatsDetail, { data, eventTypeLabels: labels }),
      ),
    );

    const rows = screen.getAllByTestId("stats-type-row");
    expect(rows).toHaveLength(3);
    // 합계 내림차순: 돌잔치(6,000,000) > 결혼식(3,000,000) > 장례식(1,000,000)
    expect(rows[0].textContent).toContain("돌잔치");
    expect(rows[0].textContent).toContain("6,000,000원");
    expect(rows[0].textContent).toContain("60%");
    expect(rows[1].textContent).toContain("결혼식");
    expect(rows[1].textContent).toContain("3,000,000원");
    expect(rows[1].textContent).toContain("30%");
    expect(rows[2].textContent).toContain("장례식");
    expect(rows[2].textContent).toContain("1,000,000원");
    expect(rows[2].textContent).toContain("10%");
  });

  it("AC-1: eventTypeLabels가 없으면 원문 유형 키를 그대로 라벨로 표시한다", async () => {
    const { StatsDetail } = await import("@/components/StatsDetail");
    const data = makeAggregate({
      totalCount: 1,
      totalAmount: 500000,
      avgAmount: 500000,
      byEventType: { OPENING: { count: 1, sum: 500000 } },
      monthly: [{ ym: "2026-08", sum: 500000 }],
    });

    render(React.createElement(MemoryRouter, null, React.createElement(StatsDetail, { data })));

    const rows = screen.getAllByTestId("stats-type-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("OPENING");
    expect(rows[0].textContent).toContain("500,000원");
    expect(rows[0].textContent).toContain("100%");
  });

  it("AC-2[P0]: 월별 추이 Sparkline이 최근 6개 구간만 그린다 (8개월 입력 -> 6개 포인트)", async () => {
    const { StatsDetail } = await import("@/components/StatsDetail");
    const monthly = Array.from({ length: 8 }, (_, i) => ({
      ym: `2026-${String(i + 1).padStart(2, "0")}`,
      sum: (i + 1) * 100000,
    }));
    const data = makeAggregate({
      totalCount: 8,
      totalAmount: monthly.reduce((s, m) => s + m.sum, 0),
      byEventType: { WEDDING: { count: 8, sum: monthly.reduce((s, m) => s + m.sum, 0) } },
      monthly,
    });

    render(React.createElement(MemoryRouter, null, React.createElement(StatsDetail, { data })));

    const svg = screen.getByTestId("stats-trend");
    const linePath = svg.querySelector("path[stroke]");
    expect(linePath).not.toBeNull();
    const d = linePath!.getAttribute("d") ?? "";
    const pointCount = (d.match(/[ML]/g) ?? []).length;
    expect(pointCount).toBe(6);
  });

  it("AC-2: 월별 데이터가 1개월뿐이면 점 1개만 그리고 예외를 던지지 않는다", async () => {
    const { StatsDetail } = await import("@/components/StatsDetail");
    const data = makeAggregate({
      totalCount: 1,
      totalAmount: 200000,
      avgAmount: 200000,
      byEventType: { WEDDING: { count: 1, sum: 200000 } },
      monthly: [{ ym: "2026-08", sum: 200000 }],
    });

    expect(() =>
      render(React.createElement(MemoryRouter, null, React.createElement(StatsDetail, { data }))),
    ).not.toThrow();
    expect(screen.getByTestId("stats-trend")).toBeInTheDocument();
  });

  it("AC-3[P0]: 전체 합계가 0이면 0으로 나누지 않고 모든 막대 폭이 0%로 렌더된다", async () => {
    const { StatsDetail } = await import("@/components/StatsDetail");
    const data = makeAggregate({
      totalCount: 0,
      totalAmount: 0,
      avgAmount: 0,
      byEventType: {
        WEDDING: { count: 0, sum: 0 },
        FUNERAL: { count: 0, sum: 0 },
      },
      monthly: [],
    });

    render(React.createElement(MemoryRouter, null, React.createElement(StatsDetail, { data })));

    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(2);
    for (const bar of bars) {
      expect(bar).toHaveAttribute("aria-valuenow", "0");
      expect(bar).not.toHaveTextContent("NaN");
    }
    const rows = screen.getAllByTestId("stats-type-row");
    expect(rows[0].textContent).toContain("0%");
    expect(rows[1].textContent).toContain("0%");
  });

  it("AC-4: 외부 차트 라이브러리 import 없음, HEX 색상 하드코딩 없음, 막대 폭은 퍼센트 기반이다", () => {
    const filePath = path.join(process.cwd(), "src/components/StatsDetail.tsx");
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).not.toMatch(/from\s+["'](recharts|chart\.js|d3|victory|nivo|react-chartjs-2)["']/i);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/width:\s*["'`]?\d+px/);
  });
});
