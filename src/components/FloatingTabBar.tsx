import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

export type TabItem = {
  label: string;
  /** Asset.ContentIcon 등(선택). 없으면 라벨만 표시. */
  icon?: ReactNode;
  path: string;
};

/**
 * 하단 탭 네비게이션 (App-in-Toss 미니앱용).
 *
 * Pre-built (재구현 금지): 메인 네비게이션이 2~5개 탭이면 직접 만들지 말고 이걸 써라.
 * ⚠️ 'TDS TabBar'는 존재하지 않는다(검증된 export 아님 — Tab은 상단 콘텐츠 전환용).
 * 직접 nav를 만들면 활성탭을 솔리드 버튼(파란 알약)으로 그리는 실수를 한다.
 * 이 컴포넌트는 네이티브 토스처럼 활성탭을 '아이콘+라벨 컬러 틴트'로만 표시한다
 * (배경 알약/Button variant=fill 금지). 활성 판정은 현재 경로(useLocation)로 자동이며,
 * 상위 레이아웃이 탭을 직접 지정하고 싶으면 activePath로 덮어쓴다(AppLayout).
 *
 * embedded=true면 스스로 fixed로 뜨지 않고 부모(고정 도크)의 흐름 안에 렌더된다 —
 * 이때 하단 safe-area 여백은 부모가 책임진다.
 */
export function FloatingTabBar({
  items,
  activePath,
  embedded = false,
}: {
  items: TabItem[];
  /** 활성 탭 경로를 상위에서 지정(미지정 시 현재 경로로 자동 판정) */
  activePath?: string;
  /** 부모가 고정 배치를 맡는 경우 true — nav 자체는 흐름에 배치된다 */
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = activePath ?? location.pathname;

  return (
    <nav
      role="tablist"
      aria-label="메인 네비게이션"
      style={{
        ...(embedded
          ? { position: "relative" }
          : { position: "fixed", left: 0, right: 0, bottom: 0 }),
        display: "flex",
        justifyContent: "space-around",
        alignItems: "stretch",
        // embedded면 하단 safe-area는 부모 도크가 준다 — 중복 여백 방지
        padding: embedded ? "6px 8px" : "6px 8px calc(var(--toss-safe-area-bottom) + 6px)",
        backgroundColor: "var(--adaptiveBackground)",
        borderTop: "1px solid var(--adaptiveGrey200)",
      }}
    >
      {items.map((item) => {
        const active = currentPath === item.path;
        return (
          <button
            key={item.path}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            onClick={() => {
              if (active) return;
              try {
                Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
              } catch {
                /* WebView 밖에서는 throw — 무시 */
              }
              navigate(item.path);
            }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "4px 0",
              minHeight: 44,
              border: "none",
              background: "none",
              cursor: "pointer",
              // 활성=브랜드 컬러 틴트, 비활성=중간 회색. 솔리드 배경/알약 없음.
              color: active ? "var(--adaptiveBlue500)" : "var(--adaptiveGrey700)",
              fontSize: 11,
              fontWeight: active ? 700 : 500,
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
