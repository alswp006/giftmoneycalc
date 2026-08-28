import { useEffect, useState, type ReactNode } from "react";
import { Button, Paragraph, Spacing, Toast } from "@toss/tds-mobile";
import {
  generateHapticFeedback,
  getIsTossLoginIntegratedService,
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { Card } from "@/components/Card";
import { ERROR_MESSAGES } from "@/lib/errors";
import { isRewardUnlocked, unlockReward } from "@/lib/settings";

const DEFAULT_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "result-detail-unlock";

interface RewardGateProps {
  /** 광고 시청 후 보여줄 상세 콘텐츠 */
  children?: ReactNode;
  /** 잠금 상태에서 보여줄 블러 미리보기 (실제 수치 문자열 금지) */
  lockedPreview: ReactNode;
  /** 광고 슬롯 ID (앱인토스 콘솔에서 발급) */
  slotId?: string;
}

/**
 * 결과 상세 리포트를 리워드 광고 뒤에 숨기는 게이트.
 * isRewardUnlocked(now)가 true일 때만 children을 렌더한다 — 잠금 상태에서는
 * children이 아예 DOM에 올라가지 않으므로 상세 수치가 노출되지 않는다.
 */
export function RewardGate({ children, lockedPreview, slotId = DEFAULT_SLOT_ID }: RewardGateProps) {
  const [unlocked, setUnlocked] = useState(() => isRewardUnlocked(Date.now()));
  const [outsideToss, setOutsideToss] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (unlocked) return;

    let cancelled = false;

    (async () => {
      try {
        await getIsTossLoginIntegratedService();
      } catch {
        if (!cancelled) setOutsideToss(true);
        return;
      }

      if (cancelled) return;

      try {
        loadFullScreenAd({
          slotId,
          onEvent: () => {
            if (!cancelled) setAdLoaded(true);
          },
          onError: () => {
            // 로드 실패 — 잠금 유지, 버튼은 비활성 상태로 남는다
          },
        } as Parameters<typeof loadFullScreenAd>[0]);
      } catch {
        // SDK 미지원 — 잠금 유지, 버튼은 비활성 상태로 남는다
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slotId, unlocked]);

  if (unlocked) {
    return <>{children}</>;
  }

  const handleUnlock = () => {
    setToastMessage(null);
    setIsShowingAd(true);

    try {
      showFullScreenAd({
        slotId,
        onEvent: (event: { type?: string }) => {
          setIsShowingAd(false);
          if (event?.type === "rewarded") {
            try {
              generateHapticFeedback({ type: "success" });
            } catch {
              // 햅틱 미지원 — 무시
            }
            const result = unlockReward(Date.now());
            if (result.ok) setUnlocked(true);
          }
        },
        onError: () => {
          setIsShowingAd(false);
          setToastMessage(ERROR_MESSAGES[500]);
        },
      } as Parameters<typeof showFullScreenAd>[0]);
    } catch {
      setIsShowingAd(false);
    }
  };

  return (
    <>
      <Card testId="reward-gate-locked">{lockedPreview}</Card>
      <Spacing size={16} />
      {outsideToss ? (
        <Paragraph.Text typography="st13">{ERROR_MESSAGES[401]}</Paragraph.Text>
      ) : (
        <Button
          variant="fill"
          display="block"
          size="large"
          disabled={isShowingAd || !adLoaded}
          onClick={handleUnlock}
          style={{ minHeight: "48px" }}
        >
          {isShowingAd ? "광고 재생 중" : "광고 보고 상세 리포트 열기"}
        </Button>
      )}
      <Toast open={toastMessage !== null} position="bottom" text={toastMessage ?? ""} />
    </>
  );
}
