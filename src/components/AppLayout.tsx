import type { ReactNode } from 'react';
import { Spacing } from '@toss/tds-mobile';
import { FloatingTabBar, type TabItem } from '@/components/FloatingTabBar';

/**
 * 탭 루트 화면(/, /history, /stats) 공통 레이아웃.
 *
 * children(화면 본문) 아래에 하단 고정 탭 도크를 배치한다. 활성 탭은 경로 추론이 아니라
 * active prop으로 결정하므로, 같은 탭 안에서 하위 경로로 들어가도 탭 표시가 흔들리지 않는다.
 *
 * ⚠️ 탭바는 이 래퍼가 소유한다 — 이 래퍼로 감싼 화면은 FloatingTabBar를 따로 렌더하지 마라
 * (탭바 2개 중첩). 라우트 등록은 통합 패킷 몫.
 */

export type TabKey = 'home' | 'history' | 'stats';

const TAB_ITEMS: Array<TabItem & { key: TabKey }> = [
  { key: 'home', label: '홈', path: '/' },
  { key: 'history', label: '기록', path: '/history' },
  { key: 'stats', label: '통계', path: '/stats' },
];

export function AppLayout({ active, children }: { active: TabKey; children?: ReactNode }) {
  const activePath = TAB_ITEMS.find((tab) => tab.key === active)?.path ?? '/';

  return (
    <>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {children}
        {/* 본문 마지막 요소가 하단 고정 탭 도크에 가리지 않도록 확보하는 여백 */}
        <Spacing size={96} />
      </div>

      {/* 고정 도크가 safe-area(홈 인디케이터)까지 책임지고, 탭바는 그 안에 흐름으로 놓인다 */}
      <div
        data-testid="app-tabbar-dock"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          backgroundColor: 'var(--adaptiveBackground)',
        }}
      >
        <FloatingTabBar items={TAB_ITEMS} activePath={activePath} embedded />
      </div>
    </>
  );
}

export default AppLayout;
