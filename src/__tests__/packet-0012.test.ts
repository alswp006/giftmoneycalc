import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { StorageState } from "@/store/StorageProvider";
import type { GiftRecord } from "@/lib/types";

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/store/StorageProvider", () => ({
  useStorage: vi.fn(),
}));

// AdSlot itself imports TossAds from @apps-in-toss/web-framework — stub the
// component so History's banner placement can be asserted without touching
// the real SDK bridge.
vi.mock("@/components/AdSlot", () => ({
  AdSlot: ({ adGroupId }: { adGroupId: string }) =>
    React.createElement("div", { "data-testid": "ad-slot-mock", "data-ad-group-id": adGroupId }),
}));

import { useStorage } from "@/store/StorageProvider";
import History from "@/pages/History";

const mockUseStorage = vi.mocked(useStorage);

function makeRecord(overrides: Partial<GiftRecord> & { id: string; createdAt: number }): GiftRecord {
  return {
    personName: "김민서",
    eventType: "wedding",
    relation: "friend",
    amount: 100000,
    date: "2026-08-01",
    direction: "given",
    memo: "",
    ...overrides,
  };
}

function baseState(overrides: Partial<StorageState> = {}): StorageState {
  return {
    ready: true,
    loadError: false,
    records: [],
    settings: { defaultRegion: "majorCity", onboardingDone: true, compactList: false },
    lastCalc: null,
    rewardUnlock: { statsUnlockedUntil: 0 },
    addRecord: vi.fn(() => ({ ok: true as const, id: "rec-1" })),
    deleteRecord: vi.fn(() => ({ ok: true as const })),
    updateSettings: vi.fn(),
    setLastCalc: vi.fn(),
    unlockStats: vi.fn(),
    clearAll: vi.fn(),
    ...overrides,
  };
}

function renderHistory() {
  return render(React.createElement(MemoryRouter, null, React.createElement(History)));
}

beforeEach(() => {
  mockUseStorage.mockReset();
  mockNavigate.mockReset();
});

describe("/history 페이지 (탭 필터 + 목록 + 삭제 + 배너)", () => {
  it("AC-1[P0]: renders records createdAt-descending with name, event label, date, and signed formatKRW amount", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [
          makeRecord({
            id: "r1",
            createdAt: 3000,
            personName: "김민서",
            eventType: "wedding",
            date: "2026-08-01",
            amount: 100000,
            direction: "given",
          }),
          makeRecord({
            id: "r2",
            createdAt: 5000,
            personName: "이지은",
            eventType: "funeral",
            date: "2026-07-15",
            amount: 50000,
            direction: "received",
          }),
          makeRecord({
            id: "r3",
            createdAt: 1000,
            personName: "박준호",
            eventType: "firstBirthday",
            date: "2026-06-10",
            amount: 30000,
            direction: "given",
          }),
        ],
      }),
    );

    renderHistory();

    const rows = screen.getAllByTestId("record-row");
    expect(rows).toHaveLength(3);

    // createdAt 내림차순: r2(5000) → r1(3000) → r3(1000)
    expect(rows[0].textContent).toContain("이지은");
    expect(rows[0].textContent).toContain("장례식");
    expect(rows[0].textContent).toContain("7월 15일");
    expect(rows[0].textContent).toContain("+50,000원");

    expect(rows[1].textContent).toContain("김민서");
    expect(rows[1].textContent).toContain("결혼식");
    expect(rows[1].textContent).toContain("-100,000원");

    expect(rows[2].textContent).toContain("박준호");
    expect(rows[2].textContent).toContain("-30,000원");
  });

  it("AC-2[P0]: switching to 받은 기록 tab shows only received records and updates the count immediately", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [
          makeRecord({ id: "r1", createdAt: 3000, personName: "김민서", direction: "given", amount: 100000 }),
          makeRecord({ id: "r2", createdAt: 2000, personName: "이지은", direction: "received", amount: 50000 }),
          makeRecord({ id: "r3", createdAt: 1000, personName: "박준호", direction: "given", amount: 30000 }),
        ],
      }),
    );

    renderHistory();

    expect(screen.getAllByTestId("record-row")).toHaveLength(3);
    expect(screen.getByTestId("history-count").textContent).toContain("3건");

    fireEvent.click(screen.getByRole("button", { name: "받은 기록" }));

    const rows = screen.getAllByTestId("record-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("이지은");
    expect(screen.getByTestId("history-count").textContent).toContain("1건");
  });

  it("AC-3[P0]: renders only the first 20 records and loads the rest on demand without exceeding the total", () => {
    const records = Array.from({ length: 25 }, (_, i) =>
      makeRecord({ id: `r${i}`, createdAt: i, personName: `사람${i}` }),
    );
    mockUseStorage.mockReturnValue(baseState({ records }));

    renderHistory();

    expect(screen.getAllByTestId("record-row")).toHaveLength(20);

    fireEvent.click(screen.getByRole("button", { name: /더 보기/ }));

    expect(screen.getAllByTestId("record-row")).toHaveLength(25);
    expect(screen.queryByRole("button", { name: /더 보기/ })).toBeNull();
  });

  it("AC-4[P0]: tapping a row opens a BottomSheet, choosing 삭제하기 then 삭제 removes the record and shows the 삭제했어요 toast", () => {
    let currentRecords: GiftRecord[] = [
      makeRecord({ id: "r1", createdAt: 1000, personName: "김민서", amount: 100000, direction: "given" }),
    ];
    const deleteRecordMock = vi.fn((id: string) => {
      currentRecords = currentRecords.filter((r) => r.id !== id);
      return { ok: true as const };
    });
    mockUseStorage.mockImplementation(() =>
      baseState({ records: currentRecords, deleteRecord: deleteRecordMock }),
    );

    renderHistory();

    expect(screen.getAllByTestId("record-row")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("record-row"));

    const sheet = screen.getByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: "삭제하기" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("김민서");
    expect(dialog.textContent).toContain("100,000원");
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "삭제" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));

    expect(deleteRecordMock).toHaveBeenCalledWith("r1");
    expect(screen.getByText("삭제했어요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("record-row")).toHaveLength(0);
  });

  it("AC-4[P0]: tapping 닫기 in the confirm dialog cancels — record stays and nothing is deleted", () => {
    const deleteRecordMock = vi.fn(() => ({ ok: true as const }));
    mockUseStorage.mockReturnValue(
      baseState({
        records: [makeRecord({ id: "r1", createdAt: 1000, personName: "김민서", amount: 100000 })],
        deleteRecord: deleteRecordMock,
      }),
    );

    renderHistory();

    fireEvent.click(screen.getByTestId("record-row"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제하기" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "닫기" }));

    expect(deleteRecordMock).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("record-row")).toHaveLength(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("AC-5[P0]: zero records shows EmptyState with 기록 추가하기 CTA that navigates to /record/new", () => {
    mockUseStorage.mockReturnValue(baseState({ records: [] }));

    renderHistory();

    expect(screen.getByTestId("history-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("record-row")).toBeNull();
    expect(screen.queryByTestId("ad-slot-mock")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "기록 추가하기" }));
    expect(mockNavigate).toHaveBeenCalledWith("/record/new");
  });

  it("AC-5[P0]: non-empty list renders an AdSlot banner below the records without covering content", () => {
    mockUseStorage.mockReturnValue(
      baseState({
        records: [makeRecord({ id: "r1", createdAt: 1000, personName: "김민서" })],
      }),
    );

    renderHistory();

    const rows = screen.getAllByTestId("record-row");
    const adSlot = screen.getByTestId("ad-slot-mock");
    expect(adSlot).toBeInTheDocument();

    const lastRow = rows[rows.length - 1];
    // eslint-disable-next-line no-bitwise
    expect(
      Boolean(lastRow.compareDocumentPosition(adSlot) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });
});
