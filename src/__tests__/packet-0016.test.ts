import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEYS } from "@/lib/constants";

// App.tsx + pages use real TDS/SDK imports (golden pattern: ScreenScaffold/SummaryHero/
// SubmitFooter/FloatingTabBar) — must mock TDS + SDK to avoid jsdom crashes. react-router-dom
// is intentionally NOT mocked here: this packet's ACs are about real route matching and
// useLocation-driven tab visibility, which the shared mockRouter() (fixed useLocation stub)
// would defeat.
mockTds();
mockAppsInToss();
mockTossRewardAd();

import App from "@/App";
import { TAB_ITEMS, isTabRoute } from "@/lib/tabs";

const ALL_ROUTES = [
  "/",
  "/calc",
  "/result",
  "/record/new",
  "/history",
  "/stats",
  "/share",
  "/settings",
];
const TAB_ROUTES = ["/", "/history", "/stats", "/settings"];
const NON_TAB_ROUTES = ["/calc", "/result", "/record/new", "/share"];

function renderAt(route: string) {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(App)),
  );
}

describe("라우터 배선 + 전역 Provider + NotFound + 탭 규칙", () => {
  it("AC-1[P0]: '/' renders the golden Home page without a white screen", () => {
    renderAt("/");

    expect(screen.getByTestId("home-hero").textContent).not.toBe("");
    expect(screen.getByTestId("home-highlights").textContent).not.toBe("");
  });

  it("AC-1[P0]: the remaining 7 defined routes each render non-empty content without throwing", () => {
    const nonHomeRoutes = ALL_ROUTES.filter((r) => r !== "/");
    expect(nonHomeRoutes).toHaveLength(7);

    for (const route of nonHomeRoutes) {
      const { container, unmount } = renderAt(route);
      expect(container.textContent).not.toBe("");
      expect(container.querySelectorAll("*").length).toBeGreaterThan(1);
      unmount();
    }
  });

  it("AC-2[P0]: App owns StorageProvider (loads from storage on mount) and main.tsx stays untouched", async () => {
    const mainTsxSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/main.tsx"),
      "utf-8",
    );
    expect(mainTsxSource).toContain("TDSMobileAITProvider");
    expect(mainTsxSource).toContain("<BrowserRouter");
    expect(mainTsxSource).not.toContain("StorageProvider");

    const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    renderAt("/");

    await waitFor(() => {
      expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.records);
    });
    expect(getItemSpy).toHaveBeenCalledWith(STORAGE_KEYS.settings);
  });

  it("AC-3[P0]: tabs.ts declares exactly the 4 tab-root screens — 홈/기록/통계/설정", () => {
    expect(TAB_ITEMS).toHaveLength(4);
    expect(TAB_ITEMS.map((t: { path: string }) => t.path)).toEqual([
      "/",
      "/history",
      "/stats",
      "/settings",
    ]);
    expect(TAB_ITEMS.map((t: { label: string }) => t.label)).toEqual([
      "홈",
      "기록",
      "통계",
      "설정",
    ]);

    expect(isTabRoute("/history")).toBe(true);
    expect(isTabRoute("/calc")).toBe(false);
    expect(isTabRoute("/record/new")).toBe(false);
  });

  it("AC-3[P0]: FloatingTabBar renders only on 홈·기록·통계·설정 and is hidden on the other 4 screens", () => {
    for (const route of TAB_ROUTES) {
      const { unmount } = renderAt(route);
      expect(screen.getByRole("tablist", { name: "메인 네비게이션" })).not.toBeNull();
      expect(screen.getAllByRole("tab")).toHaveLength(4);
      unmount();
    }

    for (const route of NON_TAB_ROUTES) {
      const { unmount } = renderAt(route);
      expect(screen.queryByRole("tablist")).toBeNull();
      unmount();
    }
  });

  it("AC-3: active tab gets aria-selected + brand color tint (not a solid pill)", () => {
    renderAt("/history");

    const activeTab = screen.getByRole("tab", { name: "기록" });
    const inactiveTab = screen.getByRole("tab", { name: "홈" });

    expect(activeTab.getAttribute("aria-selected")).toBe("true");
    expect(inactiveTab.getAttribute("aria-selected")).toBe("false");
    expect(activeTab.style.color).toBe("var(--adaptiveBlue500)");
  });

  it("AC-4[P0]: unknown route shows NotFound copy, and '홈으로 가기' navigates to '/'", () => {
    renderAt("/no-such-screen");

    expect(screen.getByText("요청한 화면을 찾을 수 없어요").textContent).toBe(
      "요청한 화면을 찾을 수 없어요",
    );
    const homeButton = screen.getByRole("button", { name: "홈으로 가기" });
    expect(homeButton.tagName).toBe("BUTTON");

    fireEvent.click(homeButton);

    expect(screen.getByTestId("home-hero").textContent).not.toBe("");
    expect(screen.queryByText("요청한 화면을 찾을 수 없어요")).toBeNull();
  });

  it("AC-5: rendering the home screen and an unknown route triggers zero console.error", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderAt("/");
    renderAt("/definitely-not-a-route");

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("INTEGRATION: every navigate() call target in src/pages and src/components matches a defined Route path", () => {
    const knownRoutes = new Set(ALL_ROUTES);
    const searchDirs = ["src/pages", "src/components"].map((d) =>
      path.resolve(process.cwd(), d),
    );

    const targets: string[] = [];
    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        const source = fs.readFileSync(path.join(dir, file), "utf-8");
        for (const match of source.matchAll(/navigate\(\s*["'`]([^"'`]+)["'`]/g)) {
          targets.push(match[1]);
        }
      }
    }

    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(knownRoutes.has(target)).toBe(true);
    }
  });
});
