// @vitest-environment jsdom
import { describe, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

function createProxyModuleMock() {
  const makeComponent = (name: string): any => {
    const Comp = (props: any) => {
      const { children, ...rest } = props ?? {};
      const safe: any = {};
      for (const k of Object.keys(rest)) {
        if (typeof rest[k] === "object" && rest[k] !== null && k !== "style") continue;
        safe[k] = rest[k];
      }
      const tag = name === "Button" || name === "FixedBottomCTA" ? "button" : "div";
      return React.createElement(tag, { "data-tds": name, ...safe }, children);
    };
    Comp.displayName = name;
    return new Proxy(Comp, {
      get(target, prop) {
        if (typeof prop !== "string" || prop in target) return (target as any)[prop];
        if (!/^[A-Z]/.test(prop)) return undefined;
        return makeComponent(`${name}.${prop}`);
      },
    });
  };
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "__esModule") return true;
        if (prop === "then") return undefined;
        return makeComponent(String(prop));
      },
      has(_t, prop) {
        return prop !== "then";
      },
    }
  );
}

vi.mock("@toss/tds-mobile", () => createProxyModuleMock());
vi.mock("@toss/tds-mobile-ait", () => createProxyModuleMock());
vi.mock("@toss/tds-colors", () => createProxyModuleMock());

import Home from "../pages/Home";
import ResultPage from "../pages/ResultPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}

function click(label: string) {
  const el = screen.getAllByText(label)[0];
  fireEvent.click(el);
}

function amountShown(): string {
  const nodes = Array.from(document.querySelectorAll("div")).map((n) => n.textContent ?? "");
  return nodes.filter((t) => /원$/.test(t.trim()) && t.length < 20).join(" | ");
}

describe("UI probe", () => {
  it("venue: 일반 예식장 vs 선택 안 함", () => {
    for (const venue of [null, "일반 예식장", "호텔·고급 예식장"]) {
      window.localStorage.clear();
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );
      click("결혼식");
      click("친구");
      if (venue) click(venue);
      click("적정 금액 보기");
      console.log("venue=" + String(venue), "=> 결과화면 금액:", amountShown());
      cleanup();
    }
  });

  it("입력 유지: 기록 화면 다녀오면?", () => {
    window.localStorage.clear();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    click("결혼식");
    click("친구");
    click("5 · 아주 가까움");
    console.log("draft after selections (제출 전) =", window.localStorage.getItem("giftmoney.draft"));
    cleanup();
    // 기록 화면 다녀온 뒤 홈 재마운트
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    const pressed = Array.from(document.querySelectorAll('[aria-pressed="true"]')).map(
      (n) => n.textContent
    );
    console.log("재진입 시 선택 유지된 칩 =", JSON.stringify(pressed));
    cleanup();
  });
});
