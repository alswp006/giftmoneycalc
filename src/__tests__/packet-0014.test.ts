import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAppsInToss, mockRouter, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEYS } from "@/storage/keys";

// ── Contract (for the Coder implementing src/pages/Home.tsx) ──
//
// - CalculateForm(from "@/components/CalculateForm")을 조립만 한다(수정 금지). 입력 상태(5종:
//   eventType/relation/attended/companions/eventDate)는 Home이 소유하고, CalculateForm에는
//   value/onChange만 내려준다.
// - 마운트 시 `getSettings()`(from "@/storage/prefs")의 defaultRelation/defaultAttended가
//   있으면 프리필한다. `useLocation().state.prefill`(RouteState["/"])이 있으면 그 값이
//   settings 기본값보다 우선 적용된다. 관계 미선택 + attended=true가 그 외의 초깃값이다.
// - 뒤로가기로 화면에 복귀했을 때(Home이 언마운트 후 재마운트) 입력 5종이 직전 값으로
//   복원되어야 한다 — useState 로컬 상태만으로는 언마운트 시 사라지므로 React 트리 바깥
//   (sessionStorage 등)에 보존한다.
// - 하단 고정 CTA: 유형+관계가 모두 선택되어야 활성화. 탭 시
//   `generateHapticFeedback({ type: 'success' })` 후 `navigate('/result', { state: { input } })`
//   (input은 RouteState["/result"]의 CalculationInput 5개 필드만 포함).
// - 테스트가 참조하는 testid: CTA 버튼 `data-testid="home-submit-cta"`,
//   하단 고정 CTA 컨테이너 `data-testid="home-bottom-cta"`(position:fixed +
//   paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' 적용).
// - TDS(`@toss/tds-mobile`) 이외 UI 라이브러리 import 금지.

mockAppsInToss();
mockRouter();

// Home은 CalculateForm(실제 Chip/ChipItem 사용)을 조립하므로, ChipItem을 제공하지 않는
// 공용 mockTds() 대신 이 패킷 전용 TDS mock을 쓴다(packet-0007과 동일 패턴).
vi.mock("@toss/tds-mobile", () => ({
  Top: Object.assign(
    ({ children, title }: any) => React.createElement("nav", { role: "navigation" }, title, children),
    { TitleParagraph: ({ children }: any) => React.createElement("h1", null, children) },
  ),
  Paragraph: {
    Text: ({ children, typography, ...props }: any) =>
      React.createElement("span", { "data-typography": typography, ...props }, children),
  },
  Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),
  Chip: ({ children, ...props }: any) => React.createElement("div", { role: "group", ...props }, children),
  ChipItem: ({ children, selected, onClick, disabled, left, right, redDot, redDotAriaLabel, ...props }: any) =>
    React.createElement(
      "button",
      { type: "button", "aria-pressed": !!selected, disabled, onClick, ...props },
      children,
    ),
  Switch: ({ checked, onChange, ...props }: any) =>
    React.createElement("input", { type: "checkbox", role: "switch", checked, onChange, ...props }),
  TextField: React.forwardRef(({ label, help, hasError, variant, ...props }: any, ref: any) =>
    React.createElement(
      "div",
      null,
      label && React.createElement("label", null, label),
      React.createElement("input", { ref, "data-variant": variant, ...props }),
      help && React.createElement("span", null, help),
    ),
  ),
  Button: ({ children, onClick, ...props }: any) => React.createElement("button", { onClick, ...props }, children),
  ListRow: Object.assign(
    ({ children, onClick, contents, left, right, ...props }: any) =>
      React.createElement("div", { onClick, role: "listitem", ...props }, left, contents, right, children),
    {
      Texts: ({ top, bottom, type }: any) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement("span", { "data-type": type }, top),
          React.createElement("span", null, bottom),
        ),
    },
  ),
  FixedBottomCTA: ({ children, onClick, disabled, ...props }: any) =>
    React.createElement("button", { onClick, disabled, ...props }, children),
  Toast: ({ open, text }: any) => (open ? React.createElement("div", { role: "status" }, text) : null),
  Asset: {
    ContentIcon: ({ alt }: any) => React.createElement("span", { role: "img", "aria-label": alt }),
  },
  Border: () => React.createElement("hr"),
}));

import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import Home from "@/pages/Home";

function renderHome() {
  return render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(Home)));
}

function seedSettings(overrides: Record<string, unknown>) {
  localStorage.setItem(
    STORAGE_KEYS.settings,
    JSON.stringify({ schemaVersion: 1, updatedAt: "2026-08-01T00:00:00.000Z", ...overrides }),
  );
}

describe("홈(계산 입력) 화면 조립 `/`", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLocation.pathname = "/";
    mockLocation.state = null;
  });

  it("AC-1[P0]: 유형과 관계가 모두 선택되기 전에는 하단 CTA가 disabled다", async () => {
    renderHome();

    const cta = await screen.findByTestId("home-submit-cta");
    expect(cta).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "결혼식" }));
    expect(screen.getByTestId("home-submit-cta")).toBeDisabled();
  });

  it("AC-1[P0]: 유형과 관계를 모두 선택하면 하단 CTA가 활성화된다", async () => {
    renderHome();

    await screen.findByTestId("home-submit-cta");
    fireEvent.click(screen.getByRole("button", { name: "결혼식" }));
    fireEvent.click(screen.getByRole("button", { name: "가족" }));

    expect(screen.getByTestId("home-submit-cta")).not.toBeDisabled();
  });

  it("AC-2[P0]: CTA 탭 시 success 햅틱 후 navigate('/result', { state: { input } })가 CalculationInput 5개 필드로 호출된다", async () => {
    renderHome();

    await screen.findByTestId("home-submit-cta");
    fireEvent.click(screen.getByRole("button", { name: "결혼식" }));
    fireEvent.click(screen.getByRole("button", { name: "가족" }));
    fireEvent.change(screen.getByTestId("companions-input"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("event-date-input"), { target: { value: "20260912" } });

    fireEvent.click(screen.getByTestId("home-submit-cta"));

    expect(generateHapticFeedback).toHaveBeenLastCalledWith({ type: "success" });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", {
      state: {
        input: {
          eventType: "WEDDING",
          relation: "FAMILY",
          attended: true,
          companions: 2,
          eventDate: "2026-09-12",
        },
      },
    });
  });

  it("AC-3[P0]: 설정에 defaultRelation/defaultAttended가 있으면 첫 렌더에 프리필된다", async () => {
    seedSettings({ defaultRelation: "FRIEND", defaultAttended: false });

    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "친구" })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(screen.queryByTestId("companions-input")).not.toBeInTheDocument();
  });

  it("AC-3: location.state.prefill이 설정 기본값보다 우선 적용된다", async () => {
    seedSettings({ defaultRelation: "FRIEND", defaultAttended: false });
    mockLocation.state = { prefill: { relation: "COWORKER", attended: true } };

    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "직장동료" })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("button", { name: "친구" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("AC-4: 결과 화면에서 뒤로가기로 돌아오면 유형·관계·참석·동반 인원·날짜 5종이 복원된다", async () => {
    const first = renderHome();

    await screen.findByTestId("home-submit-cta");
    fireEvent.click(screen.getByRole("button", { name: "장례식" }));
    fireEvent.click(screen.getByRole("button", { name: "친척" }));
    fireEvent.change(screen.getByTestId("companions-input"), { target: { value: "4" } });
    fireEvent.change(screen.getByTestId("event-date-input"), { target: { value: "20261201" } });

    first.unmount();

    renderHome();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "장례식" })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("button", { name: "친척" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByTestId("companions-input")).toHaveValue("4");
    expect(screen.getByTestId("event-date-input")).toHaveValue("2026-12-01");
  });

  it("AC-5: 하단 고정 CTA에 safe-area paddingBottom이 적용되고 TDS 외 UI 라이브러리를 쓰지 않는다", async () => {
    renderHome();

    const bottomCta = await screen.findByTestId("home-bottom-cta");
    expect(bottomCta.style.position).toBe("fixed");
    expect(bottomCta.style.paddingBottom).toBe("calc(16px + env(safe-area-inset-bottom))");

    const source = fs.readFileSync(path.join(process.cwd(), "src/pages/Home.tsx"), "utf-8");
    expect(source).not.toMatch(/from\s+["'](@mui\/|antd|@chakra-ui|shadcn|tailwindcss)/i);
    expect(source).toMatch(/from\s+["']@\/components\/CalculateForm["']/);
  });
});
