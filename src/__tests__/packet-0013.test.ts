import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";

// TDS + SDK + react-router-dom mocks (CLAUDE.md canonical pattern).
mockTds();
mockAppsInToss();
mockRouter();

import { AppLayout } from "@/components/AppLayout";
import NotFound from "@/pages/NotFound";

function renderLayout(active: "home" | "history" | "stats", children: React.ReactNode = React.createElement("div", { "data-testid": "layout-child" }, "content")) {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(AppLayout, { active }, children)),
  );
}

describe("탭 레이아웃 래퍼 + NotFound 화면", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLocation.pathname = "/";
  });

  it("AC-1[P0]: children을 렌더하고 하단에 홈/기록/통계 3탭을 고정 배치하며 active 탭이 컬러 틴트(aria-selected)로 표시된다", () => {
    renderLayout("stats");

    expect(screen.getByTestId("layout-child").textContent).toBe("content");

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual(["홈", "기록", "통계"]);

    expect(screen.getByRole("tab", { name: "통계" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "홈" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "기록" })).toHaveAttribute("aria-selected", "false");
  });

  it("AC-1[P0]: active='home'이면 홈 탭만 선택 상태이고 나머지 두 탭은 비선택 상태다", () => {
    renderLayout("home");

    expect(screen.getByRole("tab", { name: "홈" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "기록" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "통계" })).toHaveAttribute("aria-selected", "false");
  });

  it("AC-2: 하단 고정 영역에 safe-area 반영 paddingBottom이 적용되고, 콘텐츠 하단에 탭바 높이만큼의 Spacing이 확보된다", () => {
    renderLayout("history");

    const allEls = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
    const safeAreaEl = allEls.find(
      (el) => el.style.paddingBottom === "calc(16px + env(safe-area-inset-bottom))",
    );
    expect(safeAreaEl).toBeTruthy();

    const spacers = Array.from(document.querySelectorAll("[data-spacing]")) as HTMLElement[];
    const maxSpacing = Math.max(0, ...spacers.map((el) => Number(el.dataset.spacing) || 0));
    expect(maxSpacing).toBeGreaterThanOrEqual(64);
  });

  it("AC-3[P0]: NotFound가 안내 문구와 '홈으로 가기' 버튼을 렌더하고, 클릭 시 navigate('/', { replace: true })가 호출된다", () => {
    render(React.createElement(MemoryRouter, { initialEntries: ["/unknown-route"] }, React.createElement(NotFound)));

    expect(screen.getByText("찾을 수 없는 화면이에요")).toBeInTheDocument();

    const homeButton = screen.getByRole("button", { name: "홈으로 가기" });
    expect(homeButton).toBeInTheDocument();

    homeButton.click();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("AC-4: 고정 px width가 아닌 flex 레이아웃을 쓰고, HEX 색상이 인라인 스타일에 등장하지 않는다", () => {
    renderLayout("stats");

    const allEls = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
    for (const el of allEls) {
      const styleAttr = el.getAttribute("style") ?? "";
      expect(styleAttr).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
      expect(styleAttr).not.toMatch(/width:\s*\d+px/);
    }
  });
});
