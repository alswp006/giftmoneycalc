import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, advanceTimers } from "@/__tests__/__helpers__/test-utils";
import { formatNumber } from "@/lib/utils";

mockAll();

describe("공용 UI 컴포넌트 (SubmitFooter·SummaryHero·CountUp·ChipGroup)", () => {
  // AC-1 [P0]: SubmitFooter — fixed 하단 배치 + safe-area padding + children Button을 block/large로 강제
  describe("AC-1[P0]: SubmitFooter", () => {
    it("position:fixed 하단 배치이며 paddingBottom: calc(16px + env(safe-area-inset-bottom))을 적용한다", async () => {
      const { Button } = await import("@toss/tds-mobile");
      const { SubmitFooter } = await import("@/components/SubmitFooter");

      const { container } = renderWithRouter(
        React.createElement(
          SubmitFooter,
          null,
          React.createElement(Button, { onClick: () => {} }, "계산하기"),
        ),
      );

      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.position).toBe("fixed");
      expect(wrapper.style.paddingBottom).toBe("calc(16px + env(safe-area-inset-bottom))");
    });

    it("children으로 받은 TDS Button을 display=block size=large로 노출하고 클릭 시 onClick이 호출된다", async () => {
      const { Button } = await import("@toss/tds-mobile");
      const { SubmitFooter } = await import("@/components/SubmitFooter");
      const onClick = vi.fn();

      renderWithRouter(
        React.createElement(
          SubmitFooter,
          null,
          React.createElement(Button, { onClick }, "계산하기"),
        ),
      );

      const button = screen.getByRole("button", { name: "계산하기" });
      expect(button.getAttribute("display")).toBe("block");
      expect(button.getAttribute("size")).toBe("large");

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  // AC-2 [P0]: ChipGroup — 단일 선택 관리 + variant 토글 + 햅틱 + aria-pressed
  describe("AC-2[P0]: ChipGroup 단일 선택 관리", () => {
    const options = [
      { value: "wedding", label: "결혼식" },
      { value: "funeral", label: "장례식" },
    ];

    it("선택 항목은 variant=filled aria-pressed=true, 비선택은 variant=outlined aria-pressed=false를 렌더한다", async () => {
      const { ChipGroup } = await import("@/components/ChipGroup");

      renderWithRouter(
        React.createElement(ChipGroup, {
          options,
          value: "wedding",
          onChange: vi.fn(),
        }),
      );

      const selected = screen.getByRole("button", { name: "결혼식" });
      const unselected = screen.getByRole("button", { name: "장례식" });

      expect(selected.getAttribute("aria-pressed")).toBe("true");
      expect(selected.getAttribute("data-variant")).toBe("filled");
      expect(unselected.getAttribute("aria-pressed")).toBe("false");
      expect(unselected.getAttribute("data-variant")).toBe("outlined");
    });

    it("탭 시 onChange(value)와 generateHapticFeedback({type:'tickWeak'})를 호출하고 aria-pressed를 토글한다", async () => {
      const { generateHapticFeedback } = await import("@apps-in-toss/web-framework");
      const { ChipGroup } = await import("@/components/ChipGroup");
      const onChange = vi.fn();

      renderWithRouter(
        React.createElement(ChipGroup, {
          options,
          value: "wedding",
          onChange,
        }),
      );

      const unselected = screen.getByRole("button", { name: "장례식" });
      fireEvent.click(unselected);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("funeral");
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    });
  });

  // AC-3: ChipGroup 래퍼 — flex/gap:8/wrap/minHeight:44 + testId 전달
  describe("AC-3: ChipGroup 래퍼 스타일 + testId", () => {
    it("display:flex, gap:8, flexWrap:wrap, minHeight:44인 div이며 testId를 data-testid로 그대로 부여한다", async () => {
      const { ChipGroup } = await import("@/components/ChipGroup");

      renderWithRouter(
        React.createElement(ChipGroup, {
          options: [{ value: "wedding", label: "결혼식" }],
          value: "wedding",
          onChange: vi.fn(),
          testId: "event-type-chips",
        }),
      );

      const wrapper = screen.getByTestId("event-type-chips");
      expect(wrapper.tagName).toBe("DIV");
      expect(wrapper.style.display).toBe("flex");
      expect(wrapper.style.gap).toBe("8px");
      expect(wrapper.style.flexWrap).toBe("wrap");
      expect(wrapper.style.minHeight).toBe("44px");
    });
  });

  // AC-4 [P0]: SummaryHero(label/value/caption/onClick) + CountUp(0→value, durationMs 후 정지)
  describe("AC-4[P0]: SummaryHero + CountUp", () => {
    it("SummaryHero는 label/value/caption을 렌더하고 클릭 시 onClick을 호출한다", async () => {
      const { SummaryHero } = await import("@/components/SummaryHero");
      const onClick = vi.fn();

      renderWithRouter(
        React.createElement(SummaryHero, {
          label: "추천 금액",
          value: "100,000원",
          caption: "결혼식 · 친한 친구",
          onClick,
          testId: "summary-hero",
        }),
      );

      expect(screen.getByText("추천 금액").textContent).toBe("추천 금액");
      expect(screen.getByText("결혼식 · 친한 친구").textContent).toBe("결혼식 · 친한 친구");

      fireEvent.click(screen.getByTestId("summary-hero"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("CountUp은 durationMs 후 value(정수)에서 멈추고 이후 값이 더 이상 바뀌지 않는다", async () => {
      vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia);

      const { CountUp } = await import("@/components/CountUp");

      // rAF는 마운트 effect에서 즉시 예약된다 — advanceTimers()처럼 렌더 이후에
      // fake timer로 전환하면 이미 실타이머로 예약된 콜백을 따라잡지 못한다.
      // 렌더 전에 fake timers를 켜서 예약 시점부터 가짜 시계를 쓰게 한다.
      vi.useFakeTimers();
      renderWithRouter(
        React.createElement(CountUp, { value: 1000, durationMs: 100, testId: "count-value" }),
      );

      vi.advanceTimersByTime(150);
      await vi.runAllTimersAsync();
      const finalText = screen.getByTestId("count-value").textContent ?? "";
      expect(finalText).toContain(`${formatNumber(1000)}원`);

      // 추가 시간이 지나도 값은 그대로다 (멈춤 확인)
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();
      expect(screen.getByTestId("count-value").textContent).toBe(finalText);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  // AC-5 [P0]: options.ts — constants 라벨 맵 기반 옵션 배열 5종, HEX 색상 0건
  describe("AC-5[P0]: src/lib/options.ts", () => {
    it("eventType(4) relation(6) intimacy(5) attendance(2) region(4) 옵션 배열을 export한다", async () => {
      const {
        eventTypeOptions,
        relationOptions,
        intimacyOptions,
        attendanceOptions,
        regionOptions,
      } = await import("@/lib/options");

      expect(eventTypeOptions).toHaveLength(4);
      expect(relationOptions).toHaveLength(6);
      expect(intimacyOptions).toHaveLength(5);
      expect(attendanceOptions).toHaveLength(2);
      expect(regionOptions).toHaveLength(4);
    });

    it("각 옵션은 constants 라벨 맵과 일치하는 value/label을 가진다", async () => {
      const { eventTypeOptions, attendanceOptions } = await import("@/lib/options");

      expect(eventTypeOptions.find((o: { value: string }) => o.value === "wedding")?.label).toBe(
        "결혼식",
      );
      expect(eventTypeOptions.find((o: { value: string }) => o.value === "opening")?.label).toBe(
        "개업식",
      );
      expect(
        attendanceOptions.find((o: { value: string }) => o.value === "attending")?.label,
      ).toBe("참석·식사");
    });

    it("소스 코드에 HEX 색상 리터럴이 없다", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const optionsPath = path.resolve(process.cwd(), "src/lib/options.ts");
      const src = fs.readFileSync(optionsPath, "utf-8");

      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });
});
