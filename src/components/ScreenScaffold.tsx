import type { ReactNode } from "react";
import PageShell from "./PageShell";

interface ScreenScaffoldProps {
  /** 상단 영역 — 보통 TDS Top */
  top?: ReactNode;
  /** 하단 고정 영역 — 보통 SubmitFooter */
  bottom?: ReactNode;
  children: ReactNode;
}

/**
 * 골든 골격: PageShell + 헤더 + 본문 + 하단 CTA 슬롯.
 */
export default function ScreenScaffold({ top, bottom, children }: ScreenScaffoldProps) {
  return (
    <PageShell bottomInset={bottom ? 96 : 0}>
      {top}
      <div style={{ padding: "0 24px" }}>{children}</div>
      {bottom}
    </PageShell>
  );
}
