import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { HistoryRecord } from "@/lib/types";

// TDS + SDK + react-router-dom mocks (CLAUDE.md canonical pattern)
mockTds();
mockAppsInToss();
mockTossRewardAd();
mockRouter();

// useRecords() mock — mutable fixture so each test controls the record list + remove() outcome.
const { recordsBox, mockRemove } = vi.hoisted(() => ({
  recordsBox: { current: [] as any[] },
  mockRemove: vi.fn(),
}));

vi.mock("@/state/useRecords", () => ({
  useRecords: () => ({
    records: recordsBox.current,
    add: vi.fn(),
    update: vi.fn(),
    remove: mockRemove,
    reload: vi.fn(),
    lastError: null,
  }),
}));

import HistoryDetail from "@/pages/HistoryDetail";

const knownRecord: HistoryRecord = {
  id: "rec-1",
  eventType: "WEDDING",
  relation: "FRIEND",
  amount: 70000,
  recommendedAmount: 100000,
  attended: true,
  companions: 1,
  eventDate: "2026-09-12",
  memo: "청첩장 직접 전달",
  ruleVersion: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const unknownTypeRecord: HistoryRecord = {
  id: "rec-2",
  eventType: "PROMOTION",
  relation: "BFF",
  amount: 50000,
  recommendedAmount: 50000,
  attended: false,
  companions: 0,
  eventDate: "2026-07-01",
  ruleVersion: 1,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function renderDetail(id: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/history/${id}`] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/history/:id", element: React.createElement(HistoryDetail) }),
      ),
    ),
  );
}

describe("기록 상세 화면 `/history/:id`", () => {
  beforeEach(() => {
    recordsBox.current = [knownRecord, unknownTypeRecord];
    mockRemove.mockReset();
    mockNavigate.mockReset();
  });

  it("AC-1[P0]: 존재하지 않는 id로 진입하면 /history로 replace 이동하고 렌더 예외가 없다", () => {
    recordsBox.current = [knownRecord];
    expect(() => renderDetail("no-such-id")).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/history", { replace: true });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-1[P0]: 기록이 0건일 때 진입해도 /history로 replace 이동하고 렌더 예외가 없다", () => {
    recordsBox.current = [];
    expect(() => renderDetail("rec-1")).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/history", { replace: true });
  });

  it("AC-2: 알려진 유형/관계 기록은 날짜·낸 금액·추천 금액·메모가 표시된다", () => {
    renderDetail("rec-1");
    const text = document.body.textContent ?? "";
    expect(text).toContain("70,000");
    expect(text).toContain("100,000");
    expect(text).toContain("청첩장 직접 전달");
    expect(text).toContain("2026-09-12");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2: 알 수 없는 유형/관계는 '기타'로 폴백되고 원본 값은 화면 텍스트로 노출되지 않는다(라벨만 대체)", () => {
    renderDetail("rec-2");
    const text = document.body.textContent ?? "";
    const otherCount = text.split("기타").length - 1;
    expect(otherCount).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain("undefined");
  });

  it("AC-3[P0]: 삭제 확인 시 해당 1건이 제거되고 /history로 이동하며 Toast가 노출된다", async () => {
    mockRemove.mockResolvedValue({ ok: true, value: null });
    renderDetail("rec-1");

    fireEvent.click(screen.getByRole("button", { name: /삭제/ }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-label", expect.any(String));

    fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("rec-1"));
    await waitFor(() =>
      expect(mockNavigate.mock.calls.some((call) => call[0] === "/history")).toBe(true),
    );
    expect(await screen.findByText("기록을 지웠어요")).toBeInTheDocument();
  });

  it("AC-4[P0]: 삭제 실패(ok:false) 시 /history로 이동하지 않고 실패 Toast가 노출된다", async () => {
    mockRemove.mockResolvedValue({ ok: false, code: "QUOTA_EXCEEDED" });
    renderDetail("rec-1");

    fireEvent.click(screen.getByRole("button", { name: /삭제/ }));
    fireEvent.click(await screen.findByRole("button", { name: "삭제하기" }));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith("rec-1"));
    expect(await screen.findByText("기록을 지우지 못했어요")).toBeInTheDocument();
    expect(mockNavigate.mock.calls.some((call) => call[0] === "/history")).toBe(false);
    expect(document.body.textContent ?? "").toContain("70,000");
  });

  it("AC-5: '다시 계산하기' 탭 시 유형·관계·참석·동반·날짜가 prefill로 홈에 전달된다", () => {
    renderDetail("rec-1");

    fireEvent.click(screen.getByRole("button", { name: /다시 계산/ }));

    expect(mockNavigate).toHaveBeenCalledWith("/", {
      state: {
        prefill: {
          eventType: "WEDDING",
          relation: "FRIEND",
          attended: true,
          companions: 1,
          eventDate: "2026-09-12",
        },
      },
    });
  });
});
