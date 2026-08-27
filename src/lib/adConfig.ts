/**
 * §1.6 광고 식별자 접근자 — AdSlot(배너, 광고 그룹 단위)과 TossRewardAd(리워드 전면,
 * 슬롯 단위)는 서로 다른 콘솔 등록 항목이므로 절대 교차 사용하지 않는다(A8).
 * 두 함수 모두 호출 시점에 import.meta.env를 읽는다(모듈 로드 시점 캐시 금지 —
 * 테스트에서 vi.stubEnv 후 재호출로 값이 바뀌는 것을 검증한다).
 */

export function getAdGroupId(): string | null {
  const value = import.meta.env.VITE_TOSS_AD_GROUP_ID;
  return value ? value : null;
}

export function getRewardSlotId(): string | null {
  const value = import.meta.env.VITE_TOSS_AD_SLOT_ID;
  return value ? value : null;
}
