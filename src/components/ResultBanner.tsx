import { AdSlot } from "@/components/AdSlot";
import { getAdGroupId } from "@/lib/adConfig";

/**
 * 결과 화면(F4 AC-2) 하단 배너 광고. §1.6 규범에 따라 여기서 쓰는 식별자는
 * "광고 그룹 ID"(VITE_TOSS_AD_GROUP_ID)이며, F6 RewardGate가 쓰는 "슬롯 ID"와는
 * 콘솔 발급 단위가 다른 별개 상품이다(A8) — 절대 교차 사용 금지.
 * env 미설정 시(F4 AC-8) 빈 배너 박스 없이 null을 반환해 나머지 화면은 그대로 동작한다.
 */
export function ResultBanner() {
  const adGroupId = getAdGroupId();
  if (!adGroupId) return null;
  return <AdSlot adGroupId={adGroupId} />;
}
