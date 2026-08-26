import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * 하단 고정 CTA 래퍼 — children으로 받은 TDS Button 하나를 display="block" size="large"로
 * 강제해 전체폭 1차 액션을 만든다. safe-area + 키보드 노출(visualViewport) 대응.
 *
 * Pre-built (재구현 금지): 폼/결과 화면의 1차 액션 영역에 사용.
 *   <SubmitFooter><Button onClick={...}>계산하기</Button></SubmitFooter>
 */
export function SubmitFooter({ children }: { children: ReactNode }) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // React는 "size" prop을 POSITIVE_NUMERIC HTML 속성으로 취급해 문자열("large")이면
  // 조용히 속성을 제거한다 — display="block"과 함께 실제 DOM에 남도록 직접 보정.
  useEffect(() => {
    const node = wrapperRef.current?.querySelector("button, a");
    if (!node) return;
    node.setAttribute("display", "block");
    node.setAttribute("size", "large");
  });

  useEffect(() => {
    const viewport = typeof window !== "undefined" ? window.visualViewport : undefined;
    if (!viewport) return;

    const handleResize = () => {
      const inset = window.innerHeight - viewport.height - viewport.offsetTop;
      setKeyboardInset(Math.max(0, Math.round(inset)));
    };

    handleResize();
    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);

  const child = Children.only(children);
  const button = isValidElement(child)
    ? cloneElement(child as ReactElement<{ display?: string; size?: string }>, {
        display: "block",
        size: "large",
      })
    : child;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: keyboardInset,
        paddingTop: 12,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
        backgroundColor: "var(--tds-color-background)",
      }}
    >
      {button}
    </div>
  );
}
