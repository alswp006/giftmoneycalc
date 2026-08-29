// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * 결과·기록 화면 빈 상태/직접 진입 폴백 (Packet: heal-1-02)
 *
 * AC-1: 결과 화면에 state 없이 직접 진입해도 흰 화면·크래시 없이 안내 UI가 보인다
 * AC-2: localStorage 값이 없음/손상 JSON/비배열일 때 빈 배열로 폴백하고 예외를 던지지 않는다
 * AC-3: 기록이 0건일 때 빈 상태 UI가 정상 표시된다
 * AC-4: 모든 폴백 UI가 ScreenScaffold + TDS 컴포넌트로만 구성되고 HEX 하드코딩이 없다
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
        if (typeof prop !== "string" || prop in target) return (target as any)[prop];
        // 대문자로 시작하는 프로퍼티만 하위 컴포넌트로 만든다.
        // prototype/then까지 컴포넌트로 돌려주면 React가 클래스로 오인하거나 await가 멈춘다.
        if (!/^[A-Z]/.test(prop)) return undefined;
        return makeComponent(`${name}.${prop}`);
      },
    });
  };
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "__esModule") return true;
        if (prop === "then") return undefined;
        return makeComponent(String(prop));
      },
      // vitest는 mock에 실제로 존재하는 export만 허용하므로 `in`에 항상 true를 준다.
      has(_target, prop) {
        return prop !== "then";
      },
    }
  );
}

vi.mock("@toss/tds-mobile", () => createProxyModuleMock());
vi.mock("@toss/tds-mobile-ait", () => createProxyModuleMock());
vi.mock("@toss/tds-colors", () => createProxyModuleMock());
vi.mock("lucide-react", () => createProxyModuleMock());
vi.mock(
  "@apps-in-toss/web-framework",
  () => new Proxy({}, { get: (_t, prop) => (prop === "then" ? undefined : vi.fn()) })
);

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
// Path helpers for static source checks (AC-4)
// =============================================================================

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const resultPagePath = path.resolve(currentDir, "../pages/ResultPage.tsx");
const historyPagePath = path.resolve(currentDir, "../pages/HistoryPage.tsx");

// =============================================================================
// AC-1: 결과 화면 직접 진입 폴백 (state 없음 / safeCalculate가 null)
// =============================================================================

describe("AC-1: ResultPage — state 없음/직접 진입 폴백", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: location.state가 null이면 크래시 없이 안내 UI와 '다시 계산하기' 버튼을 보여주고 클릭 시 입력 화면으로 이동한다", async () => {
    const { default: ResultPage } = await import("../pages/ResultPage");

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [{ pathname: "/result", state: null }] },
        React.createElement(ResultPage)
      )
    );

    expect(screen.getByText("계산 결과를 찾을 수 없어요")).toBeInTheDocument();
    const retryButton = screen.getByText("다시 계산하기");
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-1[P0]: state는 있지만 safeCalculate가 null을 반환하는 값(알 수 없는 eventType/relation)이면 동일한 폴백 UI를 보여준다", async () => {
    const { default: ResultPage } = await import("../pages/ResultPage");

    render(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [
            { pathname: "/result", state: { eventType: "unknown_event", relation: "unknown_relation" } },
          ],
        },
        React.createElement(ResultPage)
      )
    );

    expect(screen.getByText("계산 결과를 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByText("다시 계산하기")).toBeInTheDocument();
  });
});

// =============================================================================
// AC-2: storage 모듈 안전 파싱 (없음/손상 JSON/비배열 → [])
// =============================================================================

describe("AC-2: storage.getHistoryList — 안전 파싱", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-2[P0]: 정상적인 배열 JSON은 그대로 파싱해 반환한다", async () => {
    const { getHistoryList, HISTORY_STORAGE_KEY } = await import("../lib/storage");
    const sample = [{ recommended: 50000, rangeMin: 40000, rangeMax: 70000, createdAt: 1690000000000 }];
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sample));

    const result = getHistoryList();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ recommended: 50000 });
  });

  it("AC-2[P0]: 값이 없음/손상된 JSON/비배열 JSON이면 예외 없이 빈 배열로 폴백한다", async () => {
    const { getHistoryList, HISTORY_STORAGE_KEY } = await import("../lib/storage");
    const scenarios: Array<string | null> = [null, "{not-valid-json", JSON.stringify({ recommended: 50000 }), "42"];

    scenarios.forEach((raw) => {
      if (raw === null) {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
      } else {
        localStorage.setItem(HISTORY_STORAGE_KEY, raw);
      }

      let result: unknown;
      expect(() => {
        result = getHistoryList();
      }).not.toThrow();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });
  });
});

// =============================================================================
// AC-3: 기록 0건 — 빈 상태 UI
// =============================================================================

describe("AC-3: HistoryPage — 기록 0건일 때 빈 상태 UI", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-3: 저장된 기록이 없으면 빈 상태 안내 문구가 표시되고 기록 카드는 렌더되지 않는다", async () => {
    const { default: HistoryPage } = await import("../pages/HistoryPage");

    render(React.createElement(MemoryRouter, null, React.createElement(HistoryPage)));

    expect(screen.getByText("아직 계산한 기록이 없어요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("history-item")).toHaveLength(0);
  });
});

// =============================================================================
// AC-4: 폴백 UI가 ScreenScaffold + TDS로만 구성, HEX 하드코딩 없음 (정적 검사)
// =============================================================================

describe("AC-4: 폴백 UI 소스 — ScreenScaffold 사용 + HEX 하드코딩 금지", () => {
  it("AC-4: ResultPage 소스에 하드코딩된 HEX 색상이 없고 ScreenScaffold를 사용한다", () => {
    const source = fs.readFileSync(resultPagePath, "utf-8");

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).toMatch(/ScreenScaffold/);
  });

  it("AC-4: HistoryPage 소스에 하드코딩된 HEX 색상이 없고 ScreenScaffold를 사용한다", () => {
    const source = fs.readFileSync(historyPagePath, "utf-8");

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(source).toMatch(/ScreenScaffold/);
  });
});
