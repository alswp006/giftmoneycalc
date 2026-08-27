import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { CalculationInput } from "@/lib/types";

// ── Contract (for the Coder implementing the file below) ──
//
// src/components/CalculateForm.tsx
//   export type CalculateFormProps = {
//     value: CalculationInput;                    // { eventType, relation, attended, companions, eventDate } — from "@/lib/types"
//     onChange: (next: CalculationInput) => void;  // receives the FULL next object (not a patch)
//   };
//   export function CalculateForm({ value, onChange }: CalculateFormProps): JSX.Element
//
//   - 순수 프레젠테이션 컴포넌트: 라우팅(useNavigate)·저장소(Storage/localStorage)를 직접 호출하지 않는다.
//     하단 고정 CTA(SubmitFooter 등)는 이 컴포넌트가 렌더하지 않는다(조립 화면의 책임).
//
//   - 유형 Chip 4개: TDS `Chip`(그룹) + `ChipItem`(개별)으로 구성.
//       라벨 순서/매핑: 결혼식=WEDDING, 장례식=FUNERAL, 돌잔치=FIRST_BIRTHDAY, 개업=OPENING
//       각 ChipItem은 `selected={value.eventType === TYPE}` 를 전달한다(실제 TDS ChipItemProps.selected).
//       탭 시 `onChange({ ...value, eventType: TYPE })` 호출 + `generateHapticFeedback({ type: 'tickWeak' })` 호출.
//   - 관계 Chip 6개: 동일한 Chip/ChipItem 패턴.
//       라벨 매핑: 가족=FAMILY, 친척=RELATIVE, 절친=CLOSE_FRIEND, 친구=FRIEND, 직장동료=COWORKER, 지인=ACQUAINTANCE
//       탭 시 `onChange({ ...value, relation: TYPE })` 호출 + haptic tickWeak.
//   - 참석 Switch: TDS `Switch`(checked=value.attended). 전환 시 `onChange({ ...value, attended: !value.attended })`
//     + haptic tickWeak. off일 때 동반 인원 TextField는 DOM에서 완전히 제거된다(unmount, hidden 아님).
//   - 동반 인원 TextField: attended===true일 때만 렌더. TDS `TextField`에 `inputMode="numeric"`,
//     `data-testid="companions-input"`, `help="최대 9명"`(항상 노출, 조건부 아님)을 전달한다.
//       - 입력값에서 숫자가 아닌 문자는 무시(필터링)한다. 필터링 후 남은 숫자가 없으면 onChange를 호출하지 않는다
//         (직전 유효값 유지).
//       - 필터링 후 숫자가 9를 초과하면 9로 고정(clamp)한다.
//       - 유효 변경 시 `onChange({ ...value, companions: <clamped number> })` 호출.
//   - 행사 날짜 TextField: value.eventDate를 표시하는 TextField(이 패킷의 AC 범위 밖 — 구현 자유).
//   - 모든 Chip/Switch 탭 시 `@apps-in-toss/web-framework`의 `generateHapticFeedback({ type: 'tickWeak' })` 호출.
//   - TDS 이외 UI 라이브러리 import 금지, HEX 색상 하드코딩 금지, 간격은 TDS `Spacing`만 사용(인라인 margin/padding 금지).

const generateHapticFeedback = vi.fn();
vi.mock("@apps-in-toss/web-framework", () => ({
  generateHapticFeedback: (...args: unknown[]) => generateHapticFeedback(...args),
}));

vi.mock("@toss/tds-mobile", () => ({
  Chip: ({ children, ...props }: any) =>
    React.createElement("div", { role: "group", ...props }, children),
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
  Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),
  Paragraph: {
    Text: ({ children, typography, ...props }: any) =>
      React.createElement("span", { "data-typography": typography, ...props }, children),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

function makeInput(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    eventType: "WEDDING",
    relation: "FRIEND",
    attended: true,
    companions: 0,
    eventDate: "2026-08-28",
    ...overrides,
  };
}

describe("계산 입력 폼 컴포넌트 CalculateForm", () => {
  it("AC-1[P0]: 유형 4종·관계 6종 Chip이 렌더되고 초기 선택값이 aria-pressed로 반영된다", async () => {
    const { CalculateForm } = await import("@/components/CalculateForm");
    const onChange = vi.fn();
    const value = makeInput({ eventType: "FUNERAL", relation: "COWORKER" });

    render(React.createElement(MemoryRouter, null, React.createElement(CalculateForm, { value, onChange })));

    const eventLabels = ["결혼식", "장례식", "돌잔치", "개업"];
    const relationLabels = ["가족", "친척", "절친", "친구", "직장동료", "지인"];
    for (const label of [...eventLabels, ...relationLabels]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "장례식" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "결혼식" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "직장동료" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "가족" })).toHaveAttribute("aria-pressed", "false");
  });

  it("AC-1[P0]: Chip을 탭하면 해당 그룹만 단일 선택으로 바뀌고 onChange가 나머지 필드는 유지한 채 호출된다", async () => {
    const { CalculateForm } = await import("@/components/CalculateForm");
    const onChange = vi.fn();
    const value = makeInput({ eventType: "WEDDING", relation: "FRIEND", companions: 2 });

    render(React.createElement(MemoryRouter, null, React.createElement(CalculateForm, { value, onChange })));

    fireEvent.click(screen.getByRole("button", { name: "개업" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ ...value, eventType: "OPENING" });

    fireEvent.click(screen.getByRole("button", { name: "절친" }));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith({ ...value, relation: "CLOSE_FRIEND" });
  });

  it("AC-2[P0]: 참석 Switch가 off면 동반 인원 TextField가 DOM에서 사라지고 on이면 나타난다", async () => {
    const { CalculateForm } = await import("@/components/CalculateForm");
    const onChange = vi.fn();
    const offValue = makeInput({ attended: false });

    const { rerender } = render(
      React.createElement(MemoryRouter, null, React.createElement(CalculateForm, { value: offValue, onChange })),
    );

    expect(screen.queryByTestId("companions-input")).not.toBeInTheDocument();
    const attendSwitch = screen.getByRole("switch");
    expect(attendSwitch).not.toBeChecked();

    fireEvent.click(attendSwitch);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ ...offValue, attended: true });

    rerender(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(CalculateForm, { value: makeInput({ attended: true }), onChange }),
      ),
    );
    expect(screen.getByTestId("companions-input")).toBeInTheDocument();
  });

  it("AC-3[P0]: 동반 인원이 9를 초과하면 9로 고정되고 '최대 9명' 안내가 유지된다", async () => {
    const { CalculateForm } = await import("@/components/CalculateForm");
    const onChange = vi.fn();
    const value = makeInput({ attended: true, companions: 2 });

    render(React.createElement(MemoryRouter, null, React.createElement(CalculateForm, { value, onChange })));

    const input = screen.getByTestId("companions-input");
    expect(input).toHaveAttribute("inputMode", "numeric");
    expect(screen.getByText("최대 9명")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "15" } });
    expect(onChange).toHaveBeenCalledWith({ ...value, companions: 9 });
    expect(screen.getByText("최대 9명")).toBeInTheDocument();
  });

  it("AC-3[P0]: 동반 인원에 숫자 외 문자를 입력하면 무시되고, 숫자만 반영된다", async () => {
    const { CalculateForm } = await import("@/components/CalculateForm");
    const onChange = vi.fn();
    const value = makeInput({ attended: true, companions: 3 });

    render(React.createElement(MemoryRouter, null, React.createElement(CalculateForm, { value, onChange })));

    const input = screen.getByTestId("companions-input");

    fireEvent.change(input, { target: { value: "가나다" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "5a" } });
    expect(onChange).toHaveBeenCalledWith({ ...value, companions: 5 });
  });

  it("AC-4: Chip 탭과 Switch 전환 시 tickWeak 햅틱이 호출되고 인터랙티브 요소가 버튼/스위치 역할을 갖는다", async () => {
    const { CalculateForm } = await import("@/components/CalculateForm");
    const onChange = vi.fn();
    const value = makeInput({ attended: true });

    render(React.createElement(MemoryRouter, null, React.createElement(CalculateForm, { value, onChange })));

    generateHapticFeedback.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "장례식" }));
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);

    generateHapticFeedback.mockClear();
    const attendSwitch = screen.getByRole("switch");
    expect(attendSwitch.tagName).toBe("INPUT");
    fireEvent.click(attendSwitch);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
  });

  it("AC-5: TDS 외 UI 라이브러리 미사용, HEX 색상 하드코딩 없음, 간격은 Spacing만 사용한다", () => {
    const filePath = path.join(process.cwd(), "src/components/CalculateForm.tsx");
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).not.toMatch(/from\s+["'](@mui\/|antd|@chakra-ui|shadcn|tailwindcss)/i);
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).not.toMatch(/(margin|padding)(?:Top|Bottom|Left|Right)?:\s*["'`]?\d/);
  });
});
