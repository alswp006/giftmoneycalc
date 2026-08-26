import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Button, Paragraph, Spacing } from "@toss/tds-mobile";
import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { Card } from "@/components/Card";
import { TossRewardAd } from "@/components/TossRewardAd";

/** 앱인토스 콘솔에서 발급한 리워드 광고 슬롯 ID (.env의 VITE_TOSS_AD_SLOT_ID) */
const ENV_AD_SLOT_ID: string = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "result-unlock";

/**
 * 리워드 광고를 실제로 재생할 수 있는 환경인가.
 *
 * 토스 WebView 밖(로컬 브라우저·검수자 PC·jsdom)에서는 SDK probe가 false를
 * 반환하는 게 아니라 **예외를 던진다** — 가드 없이 부르면 render/effect를 탈출해
 * 트리 전체가 언마운트되고 흰 화면이 된다.
 */
function isRewardAdSupported(): boolean {
  try {
    return loadFullScreenAd.isSupported?.() === true && showFullScreenAd.isSupported?.() === true;
  } catch {
    return false;
  }
}

interface RewardGateProps {
  /** 리워드 광고 슬롯 ID — 생략하면 VITE_TOSS_AD_SLOT_ID */
  slotId?: string;
  /** 잠금 해제 여부 — 부모가 소유하는 상태(예: storage의 statsUnlockedUntil) */
  unlocked: boolean;
  /** 광고 시청이 끝나 잠금이 풀렸을 때 1회 호출 */
  onUnlocked: () => void;
  /** 잠금 해제 후 보여줄 실제 콘텐츠 */
  children?: ReactNode;
  /** 게이트 안내 문구 */
  description?: string;
  /** 게이트 버튼 라벨 */
  buttonText?: string;
}

/**
 * 리워드 광고 게이트 — `unlocked`를 부모가 소유하는 controlled 컴포넌트.
 *
 * 잠겨 있는 동안 children은 DOM에 렌더하지 않는다(흐린 자리표시자만 노출) —
 * 흐림 처리만 하고 실제 값을 심어두면 개발자도구로 그대로 읽히기 때문이다.
 * 광고 시청이 끝나면 `onUnlocked`를 **정확히 1회** 호출한다: 실제 SDK는
 * 이벤트와 타임아웃이 경합해 완료 콜백을 두 번 쏘는 경우가 있어서, ref로
 * 한 번만 통과시킨다.
 *
 * ```tsx
 * <RewardGate unlocked={unlockedUntil > Date.now()} onUnlocked={unlockStats}>
 *   <StatsReport stats={stats} />
 * </RewardGate>
 * ```
 */
export function RewardGate({
  slotId = ENV_AD_SLOT_ID,
  unlocked,
  onUnlocked,
  children,
  description = "광고를 보면 통계 리포트를 열 수 있어요",
  buttonText = "광고 보고 확인하기",
}: RewardGateProps) {
  const firedRef = useRef(false);

  const handleRewarded = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onUnlocked();
  }, [onUnlocked]);

  // 사용자가 직접 누르는 재시도 경로 — ref 가드를 태우지 않는다.
  // 광고는 이미 끝났는데 부모의 해제 저장이 실패하면(스토리지 한도 등) unlocked가
  // 계속 false로 남는다. 그때 가드된 핸들러를 물려두면 눌러도 아무 일이 없는
  // 막다른 버튼이 되므로, 클릭은 항상 onUnlocked를 다시 시도하게 둔다.
  const handleRetry = useCallback(() => {
    firedRef.current = true;
    onUnlocked();
  }, [onUnlocked]);

  // 광고를 재생할 수 없는 환경이면 잠금을 그냥 풀어준다 — 볼 수 없는 광고를
  // 조건으로 걸면 사용자가 리포트에 영영 도달하지 못하는 막다른 길이 된다.
  useEffect(() => {
    if (unlocked) return;
    if (isRewardAdSupported()) return;
    handleRewarded();
  }, [unlocked, handleRewarded]);

  if (unlocked) return <>{children}</>;

  return (
    <div data-testid="reward-gate" style={{ width: "100%" }}>
      <Card testId="reward-gate-preview">
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            filter: "blur(6px)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <Paragraph.Text typography="t5">이번 달 경조사비</Paragraph.Text>
          <div style={{ height: 28, width: "62%", borderRadius: 8, backgroundColor: "var(--adaptiveGrey300)" }} />
          <div style={{ height: 14, width: "88%", borderRadius: 7, backgroundColor: "var(--adaptiveGrey200)" }} />
          <div style={{ height: 14, width: "74%", borderRadius: 7, backgroundColor: "var(--adaptiveGrey200)" }} />
        </div>
      </Card>

      <Spacing size={16} />

      {/*
        TossRewardAd가 광고 로드·재생을 담당하고, 완료되면 onRewarded로 알린다.
        children으로 넘긴 버튼은 광고 경로를 쓸 수 없는 환경(토스 WebView 밖 등)
        에서 TossRewardAd가 자동 해제했을 때 노출되는 진입 버튼이다 — 사용자가
        잠금 화면에 갇히지 않게 하는 탈출구.
      */}
      <TossRewardAd
        slotId={slotId}
        description={description}
        buttonText={buttonText}
        onRewarded={handleRewarded}
      >
        <Button variant="fill" size="large" display="block" onClick={handleRetry}>
          {buttonText}
        </Button>
      </TossRewardAd>
    </div>
  );
}
