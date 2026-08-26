import type { TabItem } from "@/components/FloatingTabBar";

/**
 * 하단 탭 네비게이션 구성 — 탭-루트 4개 화면.
 *
 * @AI:NOTE 탭 표시 여부는 화면이 각자 판단하지 않는다. App.tsx가 현재 경로를
 * isTabRoute()로 판정해 한 곳에서만 렌더한다(화면마다 탭바를 넣으면 중복·누락이 생긴다).
 */
export const TAB_ITEMS: TabItem[] = [
  { label: "홈", path: "/" },
  { label: "기록", path: "/history" },
  { label: "통계", path: "/stats" },
  { label: "설정", path: "/settings" },
];

/** 하단 탭을 노출하는 경로인지 판정한다. 계산·결과·기록추가·공유는 몰입 화면이라 숨긴다. */
export function isTabRoute(pathname: string): boolean {
  return TAB_ITEMS.some((tab) => tab.path === pathname);
}
