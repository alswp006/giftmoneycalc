import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Paragraph } from "@toss/tds-mobile";
import { formatNumber } from "../lib/utils";

type Typography = ComponentProps<typeof Paragraph.Text>["typography"];

/**
 * 카운트업 숫자 — 0에서 value까지 부드럽게 증가(시각 임팩트). 히어로 숫자에 사용.
 *
 * Pre-built (재구현 금지): SummaryHero의 value 슬롯 등 '핵심 숫자 하나'에. Amount처럼 nowrap+
 * tabular+단위 분리(줄바꿈 방지)를 내장한다. prefers-reduced-motion이거나 비-브라우저(jsdom)면
 * 애니메이션을 생략하고 최종값을 즉시 표시(접근성 + 테스트 안정).
 */
export function CountUp({
  value,
  unit = "원",
  typography = "t1",
  durationMs = 700,
  testId,
}: {
  value: number;
  unit?: string;
  typography?: Typography;
  durationMs?: number;
  testId?: string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const canAnimate =
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function" &&
      typeof window.matchMedia === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canAnimate || durationMs <= 0) {
      setDisplay(value);
      return;
    }

    // start를 첫 rAF 콜백의 now에서 잡는다 — performance.now()와 rAF now는
    // 환경(jsdom rAF shim, fake timers 등)에 따라 서로 다른 시계일 수 있어 섞으면 어긋난다.
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const p = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(value * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [value, durationMs]);

  return (
    <span
      data-testid={testId}
      style={{
        display: "inline-block",
        maxWidth: "100%",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Paragraph.Text typography={typography}>
        {formatNumber(display)}
        {unit}
      </Paragraph.Text>
    </span>
  );
}
