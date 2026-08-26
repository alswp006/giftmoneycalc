import { Spacing } from "@toss/tds-mobile";
import { AdSlot } from "@/components/AdSlot";

/** 앱인토스 콘솔에서 발급한 배너 광고 그룹 ID (.env의 VITE_TOSS_AD_GROUP_ID) */
const ENV_AD_GROUP_ID: string = import.meta.env.VITE_TOSS_AD_GROUP_ID ?? "";

interface AdSectionProps {
  /** 광고 그룹 ID — 생략하면 VITE_TOSS_AD_GROUP_ID */
  adGroupId?: string;
  /** 위아래 여백(px) */
  gap?: number;
}

/**
 * 비침범 배너 광고 섹션 — 콘텐츠 섹션 사이 또는 본문 맨 아래에만 놓는다.
 *
 * 광고는 문서 흐름 안에 그대로 흘러야 한다: position:fixed·z-index·오버레이를
 * 쓰면 하단 고정 CTA(SubmitFooter/FixedBottomCTA)나 탭바를 덮어 1차 액션을
 * 가린다. 그래서 여기서는 좌표계를 건드리지 않고 위아래 Spacing으로만 본문과
 * 분리한다.
 *
 * ```tsx
 * <ResultCards />
 * <AdSection />
 * <RelatedRecords />
 * ```
 */
export function AdSection({ adGroupId = ENV_AD_GROUP_ID, gap = 16 }: AdSectionProps) {
  // 광고 그룹 ID가 없으면 빈 회색 박스를 남기지 말고 섹션 자체를 생략한다.
  if (!adGroupId) return null;

  return (
    <div data-testid="ad-section" style={{ width: "100%" }}>
      <Spacing size={gap} />
      <AdSlot adGroupId={adGroupId} />
      <Spacing size={gap} />
    </div>
  );
}
