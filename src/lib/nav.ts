/**
 * 하단 탭 네비게이션 단일 소스.
 *
 * 탭-루트 4화면(`/`, `/history`, `/stats`, `/settings`)만 FloatingTabBar를 렌더한다.
 * 화면마다 목록을 따로 두면 탭이 화면별로 달라지므로(실제로 3탭/4탭이 섞였다) 여기서만 정의한다.
 * 비-탭 화면(`/calc`, `/result`, `/history/:id`, `/share`)은 SubmitFooter를 쓰므로 탭바가 없다.
 */
export const NAV_TABS: Array<{ label: string; path: string }> = [
  { label: '홈', path: '/' },
  { label: '기록', path: '/history' },
  { label: '통계', path: '/stats' },
  { label: '설정', path: '/settings' },
];

/** 탭바가 보이는 경로들 — 라우팅/레이아웃 판단용. */
export const TAB_ROOT_PATHS: readonly string[] = NAV_TABS.map((tab) => tab.path);
