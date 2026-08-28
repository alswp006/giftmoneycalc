import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { REGION_LABEL } from "@/lib/rules";
import { writeRecords } from "@/lib/storage";
import { ok, fail } from "@/lib/errors";
import type { AppSettings, GiftRecord } from "@/lib/types";

/**
 * Packet 0018 — 설정 `/settings` (확인 후 반영 · 전체 삭제)
 *
 * TDD Red Phase: src/pages/Settings.tsx does not exist yet — these tests WILL fail.
 *
 * Contract the Coder MUST implement (see mocks below for exact shape):
 * - data-testid="settings-calc-group": wrapper containing "계산 기준" header text
 * - data-testid="settings-data-group": wrapper containing "데이터 관리" header text
 * - data-testid="settings-region-row": ListRow (top="기본 지역", bottom=REGION_LABEL[defaultRegion]).
 *   style.minHeight >= "56px". Tapping opens BottomSheet (mocked role="dialog").
 *   Each region option inside the sheet: data-testid={`settings-region-option-${region}`}.
 * - data-testid="settings-inflation-row": ListRow wrapping the inflation Switch. style.minHeight >= "56px".
 *   The Switch itself (role="switch") must be wrapped in a touch-target element with
 *   data-testid="settings-switch-touch" whose style.minWidth/minHeight >= "44px".
 * - data-testid="settings-version-row": ListRow showing app version. style.minHeight >= "56px".
 * - data-testid="settings-delete-row": ListRow "모든 기록 삭제". style.minHeight >= "56px".
 *   aria-disabled="true" when there are 0 records; tapping while disabled must NOT open the AlertDialog.
 *   Tapping while enabled opens an AlertDialog (mocked role="alertdialog") with a "닫기" cancel button
 *   and a separate confirm button that calls clearAll() from "@/lib/storage".
 * - All saves go through saveSettings() from "@/lib/settings" (mocked below) — no optimistic UI:
 *   the displayed value/Switch checked state must only change after saveSettings resolves ok.
 *   While a save is in-flight, the corresponding control (Switch / region row) must be disabled
 *   so a second tap does not trigger a second saveSettings call.
 *   On failure, a Toast (role="status") appears and the control reverts to/stays at its prior value.
 */

mockAll();

const mockGetSettings = vi.fn();
const mockSaveSettings = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSettings: () => mockGetSettings(),
  saveSettings: (partial: Partial<AppSettings>) => mockSaveSettings(partial),
}));

const mockClearAll = vi.fn();
vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return { ...actual, clearAll: (...args: unknown[]) => mockClearAll(...args) };
});

import Settings from "@/pages/Settings";

const DEFAULT_SETTINGS: AppSettings = {
  defaultRegion: "seoul",
  inflationAdjustDefault: false,
  rewardUnlockedUntil: null,
};

function makeRecord(overrides: Partial<GiftRecord> = {}): GiftRecord {
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

function renderSettings() {
  return renderWithRouter(React.createElement(Settings), {
    initialEntries: [{ pathname: "/settings", state: null }],
  });
}

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
  mockGetSettings.mockReset().mockReturnValue({ ...DEFAULT_SETTINGS });
  mockSaveSettings.mockReset();
  mockClearAll.mockReset().mockImplementation(() => {
    localStorage.removeItem("gmc:records");
    localStorage.removeItem("gmc:settings");
    return ok(undefined);
  });
});

describe("설정 `/settings` (확인 후 반영 · 전체 삭제)", () => {
  it("AC-1[P0]: 계산 기준·데이터 관리 두 그룹이 섹션 헤더로 구분되고 각 ListRow는 56px 이상, Switch 터치 영역은 44x44px 이상이다", () => {
    renderSettings();

    const calcGroup = screen.getByTestId("settings-calc-group");
    const dataGroup = screen.getByTestId("settings-data-group");
    expect(calcGroup.textContent).toContain("계산 기준");
    expect(dataGroup.textContent).toContain("데이터 관리");

    const rows = [
      screen.getByTestId("settings-region-row"),
      screen.getByTestId("settings-inflation-row"),
      screen.getByTestId("settings-version-row"),
      screen.getByTestId("settings-delete-row"),
    ];
    for (const row of rows) {
      expect(row.style.minHeight.endsWith("px")).toBe(true);
      expect(parseInt(row.style.minHeight, 10)).toBeGreaterThanOrEqual(56);
    }

    const touchTarget = screen.getByTestId("settings-switch-touch");
    expect(within(touchTarget).getByRole("switch")).toBeInTheDocument();
    expect(touchTarget.style.minWidth.endsWith("px")).toBe(true);
    expect(touchTarget.style.minHeight.endsWith("px")).toBe(true);
    expect(parseInt(touchTarget.style.minWidth, 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(touchTarget.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
  });

  it("AC-2[P0]: '기본 지역' 탭 시 BottomSheet가 열리고, 선택 후 saveSettings 성공시에만 bottom 텍스트가 새 지역으로 바뀐다", async () => {
    mockSaveSettings.mockResolvedValue(ok({ ...DEFAULT_SETTINGS, defaultRegion: "busan" }));
    renderSettings();

    expect(screen.getByTestId("settings-region-row").textContent).toContain(REGION_LABEL.seoul);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-region-row"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-region-option-busan"));

    // saveSettings가 아직 안 끝났으면 bottom 텍스트는 그대로여야 함(낙관적 반영 없음)
    expect(screen.getByTestId("settings-region-row").textContent).toContain(REGION_LABEL.seoul);

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ defaultRegion: "busan" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("settings-region-row").textContent).toContain(REGION_LABEL.busan);
    });
  });

  it("AC-3[P0]: saveSettings 실패시 Toast가 뜨고 Switch가 이전 값을 그대로 유지한다", async () => {
    mockSaveSettings.mockResolvedValue(fail(500));
    renderSettings();

    const switchEl = screen.getByRole("switch") as HTMLInputElement;
    expect(switchEl.checked).toBe(false);

    fireEvent.click(switchEl);
    // 낙관적 반영 없음 — 클릭 직후에도 아직 체크되지 않아야 함
    expect(switchEl.checked).toBe(false);

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ inflationAdjustDefault: true }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
    expect(switchEl.checked).toBe(false);
  });

  it("AC-4[P0]: 저장 요청 진행 중 Switch가 disabled여서 연속 탭으로 saveSettings가 중복 호출되지 않는다", async () => {
    let resolveSave: (value: ReturnType<typeof ok>) => void = () => {};
    mockSaveSettings.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderSettings();

    const switchEl = screen.getByRole("switch") as HTMLInputElement;
    fireEvent.click(switchEl);

    await waitFor(() => {
      expect(switchEl).toBeDisabled();
    });

    fireEvent.click(switchEl);
    expect(mockSaveSettings).toHaveBeenCalledTimes(1);

    resolveSave(ok({ ...DEFAULT_SETTINGS, inflationAdjustDefault: true }));

    await waitFor(() => {
      expect(switchEl).not.toBeDisabled();
    });
    expect(switchEl.checked).toBe(true);
  });

  it("AC-5[P0]: 기록이 0건이면 '모든 기록 삭제' 행이 disabled이며 탭해도 AlertDialog가 열리지 않는다", () => {
    renderSettings();

    const deleteRow = screen.getByTestId("settings-delete-row");
    expect(deleteRow.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(deleteRow);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-5[P0]: 기록이 1건 이상이면 AlertDialog(닫기 취소) 확인 후 clearAll이 실행되어 0건이 된다", async () => {
    writeRecords([makeRecord({ id: "r1" })]);
    renderSettings();

    const deleteRow = screen.getByTestId("settings-delete-row");
    expect(deleteRow.getAttribute("aria-disabled")).not.toBe("true");

    fireEvent.click(deleteRow);
    const dialog = await screen.findByRole("alertdialog");

    // 취소 — clearAll 미호출, 기록은 그대로 남는다
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockClearAll).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("gmc:records") ?? "[]")).toHaveLength(1);

    // 다시 열어 확인 버튼 클릭 — clearAll 실행되어 0건
    fireEvent.click(deleteRow);
    const dialog2 = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog2)
      .getAllByRole("button")
      .find((b) => b.textContent !== "닫기");
    expect(confirmButton).toBeTruthy();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("gmc:records") ?? "[]")).toHaveLength(0);
    });
  });

  it("통합: App의 /settings Route가 존재하고 Settings 페이지가 크래시 없이 렌더된다", async () => {
    const { default: App } = await import("@/App");
    renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/settings", state: null }],
    });

    expect(screen.getByTestId("settings-calc-group")).toBeInTheDocument();
    expect(screen.getByTestId("settings-data-group")).toBeInTheDocument();
  });
});
