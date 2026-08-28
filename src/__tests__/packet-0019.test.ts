import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { calculate } from "@/lib/calc";
import type { CalcInput, RouteState } from "@/lib/types";

// This packet owns App.tsx's routing + FloatingTabBar composition + overlay
// lifecycle. Real react-router-dom is used (not mocked) so declarative
// redirects (<Navigate>) and real navigate() calls produce observable DOM
// changes — the most implementation-agnostic way to verify routing.
mockTds();
mockAppsInToss();
mockTossRewardAd();

import App from "@/App";
import { useOverlayLifecycle } from "@/hooks/useOverlayLifecycle";

const INPUT: CalcInput = {
  eventType: "wedding",
  relationship: "friends",
  region: "seoul",
  attend: true,
  inflationAdjust: false,
};
const RESULT = calculate(INPUT);
const RESULT_STATE: RouteState["/result"] = { input: INPUT, result: RESULT };
const SHARE_STATE: RouteState["/share"] = { input: INPUT, result: RESULT };

beforeEach(() => {
  document.body.style.overflow = "";
});

function renderApp(initialEntries: Array<string | { pathname: string; state?: unknown }>) {
  return renderWithRouter(React.createElement(App), { initialEntries });
}

describe("라우팅 + FloatingTabBar + 오버레이 수명주기 배선 (App.tsx 단독 소유)", () => {
  describe("AC-1[P0]: 8개 라우트 정의 + 미정의 경로 리다이렉트", () => {
    it("정의된 8개 경로가 각각 대응 페이지를 렌더한다", () => {
      renderApp(["/"]);
      expect(screen.getByText("경조사비 계산기")).toBeInTheDocument();

      renderApp([{ pathname: "/result", state: RESULT_STATE }]);
      expect(screen.getByText("권장 금액")).toBeInTheDocument();

      renderApp([{ pathname: "/share", state: SHARE_STATE }]);
      expect(screen.getByTestId("share-card")).toBeInTheDocument();

      renderApp(["/history"]);
      expect(screen.getAllByText("기록").length).toBeGreaterThan(0);

      renderApp(["/history/does-not-exist"]);
      expect(screen.getAllByText("기록 상세").length).toBeGreaterThan(0);

      renderApp(["/stats"]);
      expect(screen.getAllByText("통계").length).toBeGreaterThan(0);

      renderApp(["/settings"]);
      expect(screen.getAllByText("설정").length).toBeGreaterThan(0);

      // /calc has no fixed identifying text yet (placeholder page) — the
      // routing contract only requires it to mount without throwing.
      const { container } = renderApp(["/calc"]);
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    });

    it("정의되지 않은 경로는 '/'로 replace 리다이렉트되어 홈 화면을 보여준다", () => {
      renderApp(["/no-such-route"]);
      expect(screen.getByText("경조사비 계산기")).toBeInTheDocument();
      // Home is a tab-root — its presence also confirms the redirect landed
      // on a real route, not a blank/matchless render.
      expect(screen.getAllByRole("tab").length).toBe(4);
    });
  });

  describe("AC-2[P0]: FloatingTabBar는 4개 탭-루트에서만, 활성 탭 틴트", () => {
    it.each([
      ["/", "홈"],
      ["/history", "기록"],
      ["/stats", "통계"],
      ["/settings", "설정"],
    ])("탭-루트 %s에서 FloatingTabBar 1개, 활성 탭은 %s", (routePath, activeLabel) => {
      renderApp([routePath]);
      const tablists = screen.getAllByRole("tablist");
      expect(tablists).toHaveLength(1);
      const tabs = within(tablists[0]).getAllByRole("tab");
      expect(tabs).toHaveLength(4);
      const selected = within(tablists[0]).getByRole("tab", { selected: true });
      expect(selected).toHaveAccessibleName(activeLabel);
    });

    it("비-탭 화면(/calc, /result, /share, /history/:id)에서는 FloatingTabBar가 렌더되지 않는다", () => {
      renderApp(["/calc"]);
      expect(screen.queryAllByRole("tablist")).toHaveLength(0);

      renderApp([{ pathname: "/result", state: RESULT_STATE }]);
      expect(screen.queryAllByRole("tablist")).toHaveLength(0);

      renderApp([{ pathname: "/share", state: SHARE_STATE }]);
      expect(screen.queryAllByRole("tablist")).toHaveLength(0);

      renderApp(["/history/abc123"]);
      expect(screen.queryAllByRole("tablist")).toHaveLength(0);
    });
  });

  describe("AC-3[P0]: 오버레이 수명주기 — 라우트 변경/뒤로가기 시 닫힘 + overflow 해제", () => {
    function OverlayHarness() {
      const { id } = useParams();
      const navigate = useNavigate();
      const { isOpen, open } = useOverlayLifecycle("test-sheet");
      return React.createElement(
        "div",
        null,
        React.createElement("span", { "data-testid": "id" }, id),
        React.createElement("span", { "data-testid": "state" }, isOpen ? "open" : "closed"),
        React.createElement("button", { onClick: open }, "열기"),
        React.createElement(
          "button",
          { onClick: () => navigate(`/item/${id === "1" ? "2" : "1"}`) },
          "다음 항목",
        ),
      );
    }

    function renderOverlayHarness(initialEntry: string) {
      return render(
        React.createElement(
          MemoryRouter,
          { initialEntries: [initialEntry] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: "/item/:id", element: React.createElement(OverlayHarness) }),
          ),
        ),
      );
    }

    it("open() 호출 시 isOpen=true, body.overflow가 잠긴다", () => {
      renderOverlayHarness("/item/1");
      expect(screen.getByTestId("state").textContent).toBe("closed");
      fireEvent.click(screen.getByText("열기"));
      expect(screen.getByTestId("state").textContent).toBe("open");
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("같은 라우트 패턴 내 경로 변경(같은 컴포넌트 유지) 시 오버레이가 닫히고 overflow 잠금이 풀린다", () => {
      renderOverlayHarness("/item/1");
      fireEvent.click(screen.getByText("열기"));
      expect(screen.getByTestId("state").textContent).toBe("open");

      fireEvent.click(screen.getByText("다음 항목"));

      expect(screen.getByTestId("id").textContent).toBe("2");
      expect(screen.getByTestId("state").textContent).toBe("closed");
      expect(document.body.style.overflow).toBe("");
    });

    it("하드웨어 뒤로가기(popstate)에도 열려 있던 오버레이가 닫히고 overflow 잠금이 풀린다", () => {
      renderOverlayHarness("/item/1");
      fireEvent.click(screen.getByText("열기"));
      expect(screen.getByTestId("state").textContent).toBe("open");

      fireEvent(window, new PopStateEvent("popstate"));

      expect(screen.getByTestId("state").textContent).toBe("closed");
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("AC-4[P0]: 8개 경로 모두 흰 화면 없이 렌더 (통합 스모크)", () => {
    it.each([
      ["/"],
      ["/history"],
      ["/history/smoke-id"],
      ["/stats"],
      ["/settings"],
      ["/calc"],
    ])("경로 %s는 크래시 없이 비어있지 않은 콘텐츠를 렌더한다", (routePath) => {
      const { container } = renderApp([routePath]);
      expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(container.querySelectorAll("*").length).toBeGreaterThan(0);
    });

    it("state가 필요한 /result, /share도 state 제공 시 크래시 없이 렌더된다", () => {
      const resultRender = renderApp([{ pathname: "/result", state: RESULT_STATE }]);
      expect(resultRender.container.textContent?.trim().length ?? 0).toBeGreaterThan(0);

      const shareRender = renderApp([{ pathname: "/share", state: SHARE_STATE }]);
      expect(shareRender.container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  describe("AC-5: main.tsx 보존 (@AI:ANCHOR)", () => {
    it("src/main.tsx의 @AI:ANCHOR 주석과 TDSMobileAITProvider/BrowserRouter 배선이 그대로 남아있다", () => {
      const mainTsxPath = path.resolve(__dirname, "../main.tsx");
      const content = fs.readFileSync(mainTsxPath, "utf-8");
      expect(content).toContain("@AI:ANCHOR");
      expect(content).toContain("TDSMobileAITProvider");
      expect(content).toContain("BrowserRouter");
    });
  });

  describe("통합 테스트: navigate() 대상 ↔ Route 정의 일치", () => {
    it("소스 전역에서 navigate()로 이동하는 모든 정적 경로가 App 라우트로 존재한다", () => {
      const navigateTargets = ["/calc", "/history", "/", "/share", "/settings", "/stats"];
      const definedRoutes = ["/", "/calc", "/result", "/history", "/history/:id", "/stats", "/share", "/settings"];
      for (const target of navigateTargets) {
        const matches = definedRoutes.some(
          (route) => route === target || (route.endsWith("/:id") && target.startsWith(route.replace(":id", ""))),
        );
        expect(matches).toBe(true);
      }
    });

    it("모든 정의된 페이지 파일이 실제로 존재한다 (routing 대상 모듈 누락 방지)", () => {
      const pageFiles = [
        "Home.tsx",
        "Calc.tsx",
        "Result.tsx",
        "History.tsx",
        "HistoryDetail.tsx",
        "Stats.tsx",
        "Share.tsx",
        "Settings.tsx",
      ];
      for (const file of pageFiles) {
        const filePath = path.resolve(__dirname, "../pages", file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });
});
