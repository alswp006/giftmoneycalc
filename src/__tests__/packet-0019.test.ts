import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { useRecords } from "@/state/useRecords";

// TDS + SDK + react-router-dom mocks (CLAUDE.md canonical pattern).
mockTds();
mockAppsInToss();
mockRouter();

// ── Contract (for the Coder implementing src/App.tsx) ──
//
// - App.tsx is the SOLE owner of: BrowserRouter's <Routes>, RecordsProvider placement,
//   AppErrorBoundary placement, OnboardingDialog mount.
// - Routes: "/" -> Home, "/result" -> Result, "/history" -> History,
//   "/history/:id" -> HistoryDetail, "/stats" -> Stats, "*" -> NotFound.
// - RecordsProvider MUST wrap the router (or at least all routes) so useRecords() works
//   on every screen, including "/result" and "/history/:id" which are NOT tab-root screens.
// - AppErrorBoundary MUST wrap the whole route tree.
// - OnboardingDialog is mounted once, above/alongside the router (not per-page).
// - main.tsx is NOT modified — it already renders <BrowserRouter><App /></BrowserRouter>.
//   Therefore App.tsx must NOT itself render another <BrowserRouter> (double router).
//
// Task 3.6 (`src/pages/Result.tsx`) is a SEPARATE packet's responsibility — it is stubbed
// below via vi.mock so this packet's tests exercise ONLY the App shell wiring, not Result's
// own business logic. The Coder for src/App.tsx must still import the real "@/pages/Result"
// module path so npx tsc --noEmit resolves (a minimal real file must exist at that path).

vi.mock("@/pages/Result", () => ({
  default: function MockResult() {
    const { records } = useRecords();
    return React.createElement(
      "div",
      { "data-testid": "page-result" },
      `result-records:${records.length}`,
    );
  },
}));

vi.mock("@/pages/HistoryDetail", () => ({
  default: function MockHistoryDetail() {
    const { records } = useRecords();
    return React.createElement(
      "div",
      { "data-testid": "page-history-detail" },
      `detail-records:${records.length}`,
    );
  },
}));

import App from "@/App";

function renderApp(initialPath: string) {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [initialPath] }, React.createElement(App)),
  );
}

describe("앱 셸 조립 — 라우터 · 전역 Provider · 레이아웃 배선", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: /, /history, /stats, /history/:id, /result 경로가 각각 대응 화면으로 렌더된다", () => {
    renderApp("/");
    expect(document.body.textContent ?? "").toContain("경조사비 계산");

    renderApp("/history");
    expect(document.body.textContent ?? "").toContain("기록");

    renderApp("/stats");
    expect(document.body.textContent ?? "").toContain("통계");

    renderApp("/history/rec-1");
    expect(screen.getByTestId("page-history-detail")).toBeInTheDocument();

    renderApp("/result");
    expect(screen.getByTestId("page-result")).toBeInTheDocument();
  });

  it("AC-1[P0]: 정의되지 않은 경로는 NotFound로 폴백되고 렌더 예외가 없다", () => {
    expect(() => renderApp("/no-such-screen-xyz")).not.toThrow();
    expect(document.body.textContent ?? "").toContain("찾을 수 없는 화면이에요");
    expect(screen.getByRole("button", { name: "홈으로 가기" })).toBeInTheDocument();
  });

  it("AC-2: 탭 루트 3화면(/, /history, /stats)에는 하단 탭 3개가 노출되고, /result·/history/:id에는 탭이 없다", () => {
    renderApp("/");
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    renderApp("/result");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);

    renderApp("/history/rec-1");
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("AC-3[P0]: RecordsProvider가 라우터 상위에 있어 탭 루트 화면과 /result 화면 모두 useRecords()가 예외 없이 동작한다", () => {
    renderApp("/history");
    // History는 useRecords()를 직접 호출한다 — Provider가 없으면 AppErrorBoundary가
    // "화면을 불러오지 못했어요"로 폴백하므로, 그 문구가 없어야 정상 연결이다.
    expect(document.body.textContent ?? "").not.toContain("화면을 불러오지 못했어요");
    expect(document.body.textContent ?? "").toContain("아직 기록이 없어요");

    renderApp("/result");
    expect(screen.getByTestId("page-result").textContent).toBe("result-records:0");
  });

  it("AC-4: OnboardingDialog는 최초 진입에만 노출되고, 확인 후 재진입에는 다시 뜨지 않는다", async () => {
    const first = renderApp("/");
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    dialog.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    first.unmount();

    renderApp("/");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-5: main.tsx는 수정되지 않고(@AI:ANCHOR·BrowserRouter·TDSMobileAITProvider 유지), App.tsx는 BrowserRouter를 직접 렌더하지 않는다", () => {
    const mainSource = fs.readFileSync(path.join(process.cwd(), "src/main.tsx"), "utf-8");
    expect(mainSource).toContain("@AI:ANCHOR");
    expect(mainSource).toContain("<BrowserRouter");
    expect(mainSource).toContain("TDSMobileAITProvider");

    const appSource = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf-8");
    expect(appSource).not.toMatch(/<BrowserRouter/);
    expect(appSource).toMatch(/RecordsProvider/);
    expect(appSource).toMatch(/AppErrorBoundary/);
    expect(appSource).toMatch(/OnboardingDialog/);
  });

  it("통합: 페이지 내부의 모든 navigate() 대상 경로가 App.tsx의 Route path로 정의되어 있다", () => {
    const pagesDir = path.join(process.cwd(), "src/pages");
    const pageFiles = fs
      .readdirSync(pagesDir)
      .filter((f) => f.endsWith(".tsx") && !f.startsWith("__"));

    const navigateTargets = new Set<string>();
    for (const file of pageFiles) {
      const source = fs.readFileSync(path.join(pagesDir, file), "utf-8");
      for (const m of source.matchAll(/navigate\(\s*["'`](\/[a-zA-Z0-9/_-]*)["'`]/g)) {
        navigateTargets.add(m[1]);
      }
    }
    expect(navigateTargets.size).toBeGreaterThan(0);

    const appSource = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf-8");
    const routePaths = Array.from(appSource.matchAll(/path=["'`]([^"'`]+)["'`]/g)).map((m) => m[1]);

    for (const target of navigateTargets) {
      const matched = routePaths.some((p) => {
        if (p === target) return true;
        if (!p.includes(":")) return false;
        const pattern = "^" + p.replace(/:[^/]+/g, "[^/]+") + "$";
        return new RegExp(pattern).test(target);
      });
      expect(matched, `navigate target "${target}" has no matching Route path in App.tsx`).toBe(true);
    }
  });
});
