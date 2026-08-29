import type { ReactNode } from "react";
import { adaptive } from "@toss/tds-colors";

interface PageShellProps {
  children: ReactNode;
  /** 하단 고정 CTA가 있는 화면은 본문 바닥 여백을 더 준다 */
  bottomInset?: number;
}

/**
 * 페이지 SafeArea 래퍼. 100dvh + safe-area + adaptive 배경.
 */
export default function PageShell({ children, bottomInset = 0 }: PageShellProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: adaptive.background,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: `calc(env(safe-area-inset-bottom) + ${bottomInset}px)`,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
