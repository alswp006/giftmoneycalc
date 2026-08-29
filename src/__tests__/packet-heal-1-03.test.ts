// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * 에러 경로 회귀 테스트 및 전역 에러 바운더리 (Packet: heal-1-03)
 *
 * AC-1: 계산 코어 에러 경로 회귀 테스트가 통과하고 기존 정상 계산(A~D)도 그대로 통과한다
 * AC-2: 하위 컴포넌트에서 예외가 발생해도 ErrorBoundary가 복구 화면을 렌더하며 앱이 빈 화면이 되지 않는다
 * AC-3: App.tsx가 크래시 없이 렌더되고, AppErrorBoundary로 라우트 트리를 감싼다
 * AC-4: ErrorBoundary 복구 화면이 ScreenScaffold를 사용하고 HEX 하드코딩이 없다
 */

// =============================================================================
// Mocks — TDS는 jsdom에서 충돌하므로 범용 프록시 스텁으로 대체
// =============================================================================

function createProxyModuleMock() {
  const makeComponent = (name: string): any => {
    const Comp = (props: any) => {
      const { children, ...rest } = props ?? {};
      return React.createElement("div", { "data-tds": name, ...rest }, children);
    };
    Comp.displayName = name;
    return new Proxy(Comp, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return makeComponent(`${name}.${String(prop)}`);
      },
    });
  };
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "__esModule") return true;
        return makeComponent(String(prop));
      },
    }
  );
}

vi.mock("@toss/tds-mobile", () => createProxyModuleMock());
vi.mock("@toss/tds-mobile-ait", () => createProxyModuleMock());
vi.mock("@toss/tds-colors", () => createProxyModuleMock());
vi.mock("lucide-react", () => createProxyModuleMock());
vi.mock("@apps-in-toss/web-framework", () => new Proxy({}, { get: () => vi.fn() }));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useNavigate: () => mockNavigate,
}));

const mockSetInput = vi.fn();
vi.mock("@/state/AppStateContext", () => ({
  useAppState: () => ({ input: null, setInput: mockSetInput }),
}));

// =============================================================================
// Path helpers for static source checks
// =============================================================================

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const errorBoundaryPath = path.resolve(currentDir, "../components/AppErrorBoundary.tsx");
const appPath = path.resolve(currentDir, "../App.tsx");

// =============================================================================
// AC-1: 계산 코어 에러 경로 회귀 + 정상 A~D 케이스
// =============================================================================

import { normalizeCalcInput, safeCalculate, snapToLadder } from "../lib/calc";

describe("AC-1: calc 에러 경로 회귀 테스트", () => {
  it("AC-1[P0]: undefined·빈 부분 입력·미지의 eventType/relation이어도 예외 없이 null을 반환한다", () => {
    expect(() => safeCalculate(undefined as any)).not.toThrow();
    expect(safeCalculate(undefined as any)).toBeNull();

    expect(() => safeCalculate({} as any)).not.toThrow();
    expect(safeCalculate({} as any)).toBeNull();

    const unknownEventType = safeCalculate({ eventType: "unknown_event", relation: "friend" });
    expect(unknownEventType).toBeNull();

    const unknownRelation = safeCalculate({ eventType: "wedding", relation: "unknown_relation" });
    expect(unknownRelation).toBeNull();
  });

  it("AC-1[P0]: NaN intimacy는 기본값 3으로 정규화되고 snapToLadder는 경계값에서도 크래시 없이 최솟값을 반환한다", () => {
    const normalized = normalizeCalcInput({ eventType: "wedding", relation: "friend", intimacy: NaN });
    expect(normalized.intimacy).toBe(3);

    const result = safeCalculate({ eventType: "wedding", relation: "friend", intimacy: NaN });
    expect(result).not.toBeNull();
    expect(result?.recommended).toBe(70000);

    expect(() => snapToLadder(NaN)).not.toThrow();
    expect(snapToLadder(NaN)).toBe(10000);
    expect(snapToLadder(undefined as any)).toBe(10000);
  });

  it("AC-1[P0]: SPEC 예시 A~D가 기존 recommended·range 값 그대로 통과한다", () => {
    const a = safeCalculate({
      eventType: "wedding",
      relation: "friend",
      intimacy: 3,
      region: "metro",
      attendance: "attend",
      venue: "hotel",
    });
    expect(a).toEqual({ recommended: 100000, rangeMin: 80000, rangeMax: 120000 });

    const b = safeCalculate({
      eventType: "doljanchi",
      relation: "relative",
      intimacy: 4,
      region: "region",
      attendance: "attend",
      venue: null,
    });
    expect(b).toEqual({ recommended: 50000, rangeMin: 40000, rangeMax: 70000 });

    const c = safeCalculate({
      eventType: "birthday",
      relation: "colleague",
      intimacy: 2,
      region: "metro",
      attendance: "attend",
      venue: null,
    });
    expect(c).toEqual({ recommended: 30000, rangeMin: 20000, rangeMax: 40000 });

    const d = safeCalculate({
      eventType: "hwangap",
      relation: "parent",
      intimacy: 5,
      region: "region",
      attendance: "host",
      venue: null,
    });
    expect(d).toEqual({ recommended: 200000, rangeMin: 150000, rangeMax: 250000 });
  });
});

// =============================================================================
// AC-2: 전역 ErrorBoundary — 하위 컴포넌트 예외를 잡아 복구 화면을 렌더
// =============================================================================

describe("AC-2: AppErrorBoundary — 하위 컴포넌트 예외 복구", () => {
  const ThrowingChild = () => {
    throw new Error("boom");
  };

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockClear();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("AC-2[P0]: 하위 컴포넌트가 렌더 중 예외를 던져도 빈 화면 대신 복구 화면과 '홈으로 가기' 버튼을 보여주고 클릭 시 홈으로 이동한다", async () => {
    const { default: AppErrorBoundary } = await import("../components/AppErrorBoundary");

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(AppErrorBoundary, null, React.createElement(ThrowingChild))
      )
    );

    expect(document.body.textContent).not.toBe("");
    const homeButton = screen.getByText("홈으로 가기");
    expect(homeButton).toBeInTheDocument();

    fireEvent.click(homeButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-2[P0]: 하위 컴포넌트가 정상 렌더될 때는 children을 그대로 보여주고 복구 화면을 표시하지 않는다", async () => {
    const { default: AppErrorBoundary } = await import("../components/AppErrorBoundary");

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          AppErrorBoundary,
          null,
          React.createElement("div", { "data-testid": "child-ok" }, "정상 렌더")
        )
      )
    );

    expect(screen.getByTestId("child-ok")).toBeInTheDocument();
    expect(screen.queryByText("홈으로 가기")).not.toBeInTheDocument();
  });
});

// =============================================================================
// AC-3: App.tsx — 크래시 없이 렌더 + AppErrorBoundary로 라우트 트리를 감쌈
// =============================================================================

describe("AC-3: App.tsx — 렌더 성공 + AppErrorBoundary 배선", () => {
  it("AC-3[P0]: App이 MemoryRouter 안에서 예외 없이 렌더되고, 소스가 AppErrorBoundary로 라우트를 감싼다", async () => {
    const { default: App } = await import("../App");

    expect(() => {
      render(React.createElement(MemoryRouter, null, React.createElement(App)));
    }).not.toThrow();
    expect(document.body.textContent).not.toBe("");

    const source = fs.readFileSync(appPath, "utf-8");
    expect(source).toMatch(/AppErrorBoundary/);
  });
});

// =============================================================================
// AC-4: 복구 화면 소스 — ScreenScaffold 사용 + HEX 하드코딩 금지 (정적 검사)
// =============================================================================

describe("AC-4: AppErrorBoundary 복구 화면 — ScreenScaffold 준수", () => {
  it("AC-4: AppErrorBoundary 소스에 하드코딩된 HEX 색상이 없고 ScreenScaffold를 사용한다", () => {
    const source = fs.readFileSync(errorBoundaryPath, "utf-8");

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).toMatch(/ScreenScaffold/);
  });
});
