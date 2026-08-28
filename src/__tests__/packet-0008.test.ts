import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { EVENT_TYPE_LABEL } from "@/lib/rules";
import type { GiftRecord } from "@/lib/types";

// mock setup MUST run before importing anything that transitively pulls in
// "@toss/tds-mobile" / "@apps-in-toss/web-framework" (both crash in jsdom unmocked).
mockAll();

import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import Home from "@/pages/Home";

// Contract (Coder implements exactly):
// - Hero: <SummaryHero testId="home-hero" value={<CountUp .../>} caption={`${n}건 기록했어요`}
//   action={<Button onClick={haptic -> navigate('/calc')}>권장 금액 계산하기</Button>} />
//   totalAmount/count scoped to the CURRENT MONTH (eventDate.slice(0,7) === this month).
// - 바로 계산 Chip 행: one Chip per EventType, label = EVENT_TYPE_LABEL[eventType],
//   onClick navigates('/calc', { state: { prefill: { eventType } } }).
// - 최근 기록: up to 3 most-recent GiftRecord (queryRecords() default sort — already desc),
//   each row carries data-testid="home-recent-record" + data-record-id={record.id},
//   onClick navigates('/history/' + record.id).
// - Empty (0 records): Hero still renders '0원' (never hidden); recent-record area renders
//   EmptyState(title="아직 기록이 없어요") + Button(name="계산하기").
// - AdSlot only renders (an element carrying [data-ad-group-id]) when
//   import.meta.env.VITE_TOSS_AD_GROUP_ID is a non-empty string.

const AUG_RECORD_1: GiftRecord = {
  id: "r-aug-1",
  personName: "김민지",
  eventType: "wedding",
  relationship: "friends",
  eventDate: "2026-08-05",
  amount: 100000,
  memo: "",
  createdAt: 1,
  updatedAt: 1,
};

const AUG_RECORD_2: GiftRecord = {
  id: "r-aug-2",
  personName: "박서준",
  eventType: "funeral",
  relationship: "colleagues",
  eventDate: "2026-08-20",
  amount: 50000,
  memo: "",
  createdAt: 2,
  updatedAt: 2,
};

const JUL_RECORD: GiftRecord = {
  id: "r-jul-1",
  personName: "이수민",
  eventType: "firstBirthday",
  relationship: "relatives",
  eventDate: "2026-07-31",
  amount: 300000,
  memo: "",
  createdAt: 3,
  updatedAt: 3,
};

function seedRecords(records: GiftRecord[]) {
  seedLocalStorage({ "gmc:records": records });
}

describe("홈 화면 `/`", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T09:00:00"));
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("AC-1[P0]: 이번 달 총액을 CountUp으로 표시하고, 캡션에 '{n}건 기록했어요'가 나온다", () => {
    seedRecords([AUG_RECORD_1, AUG_RECORD_2, JUL_RECORD]);

    renderWithRouter(React.createElement(Home));

    const hero = screen.getByTestId("home-hero");
    // 7월 기록(300,000원)은 이번 달(8월) 총액에서 제외되어야 한다.
    expect(hero.textContent).toContain("150,000원");
    expect(hero.textContent).toContain("2건 기록했어요");
    expect(hero.textContent).not.toContain("450,000원");
  });

  it("AC-1[P0]: 기록이 없으면 총액이 0으로 표시된다", () => {
    seedRecords([]);

    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("home-hero").textContent).toContain("0건 기록했어요");
  });

  it("AC-2[P0]: 기록 0건이면 Hero는 '0원'을 유지하고, 최근 기록 자리엔 EmptyState가 뜬다", () => {
    seedRecords([]);

    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("home-hero").textContent).toContain("0원");
    expect(screen.getByText("아직 기록이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "계산하기" })).toBeInTheDocument();
    expect(screen.queryAllByTestId("home-recent-record")).toHaveLength(0);
  });

  it("AC-3[P0]: '권장 금액 계산하기' 탭 시 haptic이 먼저 호출되고 이어서 /calc로 이동한다", () => {
    seedRecords([AUG_RECORD_1]);

    renderWithRouter(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "권장 금액 계산하기" }));

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(mockNavigate).toHaveBeenCalledWith("/calc");
    const hapticOrder = vi.mocked(generateHapticFeedback).mock.invocationCallOrder[0];
    const navigateOrder = mockNavigate.mock.invocationCallOrder[0];
    expect(hapticOrder).toBeLessThan(navigateOrder);
  });

  it("AC-4[P0]: 행사 Chip 탭 시 해당 eventType이 prefill된 채 /calc로 이동한다", () => {
    seedRecords([]);

    renderWithRouter(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: EVENT_TYPE_LABEL.funeral }));

    expect(mockNavigate).toHaveBeenCalledWith("/calc", {
      state: { prefill: { eventType: "funeral" } },
    });
  });

  it("AC-4[P0]: 최근 기록 행 탭 시 /history/{id}로 이동한다", () => {
    seedRecords([AUG_RECORD_1, AUG_RECORD_2, JUL_RECORD]);

    renderWithRouter(React.createElement(Home));
    const rows = screen.getAllByTestId("home-recent-record");
    expect(rows).toHaveLength(3);

    const julRow = rows.find((el) => el.getAttribute("data-record-id") === "r-jul-1");
    expect(julRow).toBeDefined();
    fireEvent.click(julRow as HTMLElement);

    expect(mockNavigate).toHaveBeenCalledWith("/history/r-jul-1");
  });

  it("AC-5[P1]: VITE_TOSS_AD_GROUP_ID가 빈 값이면 AdSlot이 아무것도 렌더하지 않는다", () => {
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "");
    seedRecords([AUG_RECORD_1]);

    const { container } = renderWithRouter(React.createElement(Home));

    expect(container.querySelector("[data-ad-group-id]")).toBeNull();
    // 나머지 골격(Hero)은 정상적으로 렌더돼야 한다 — 빈 광고 슬롯이 화면을 깨뜨리지 않는다.
    expect(screen.getByTestId("home-hero")).toBeInTheDocument();
  });
});
