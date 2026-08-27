import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Button, Asset, Border } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { EmptyState } from "@/components/StateView";
import { RewardGate, isRewardUnlocked } from "@/components/RewardGate";
import { StatsDetail } from "@/components/StatsDetail";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useRecords } from "@/state/useRecords";
import { aggregate } from "@/domain/aggregate";
import { getReward } from "@/storage/prefs";
import { getRewardSlotId } from "@/lib/adConfig";

const EVENT_TYPE_LABEL: Record<string, string> = {
  WEDDING: "결혼식",
  FUNERAL: "장례식",
  FIRST_BIRTHDAY: "돌잔치",
  OPENING: "개업",
};

const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "기록", path: "/history" },
  { label: "통계", path: "/stats" },
];

export default function Stats() {
  const navigate = useNavigate();
  const { records } = useRecords();
  const [reward, setReward] = useState<number | null>(null);
  const [rewardLoaded, setRewardLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getReward().then((value) => {
      if (!cancelled) {
        setReward(value);
        setRewardLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const agg = aggregate(records);
  const slotId = getRewardSlotId();
  const unlocked = rewardLoaded && isRewardUnlocked(reward, Date.now());

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>통계</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      {records.length === 0 ? (
        <EmptyState
          icon={
            <Asset.ContentIcon name="iconChartRegular" alt="통계 없음" style={{ width: 48, height: 48 }} />
          }
          title="아직 통계를 만들 기록이 없어요"
          description="기록을 남기면 여기서 지출을 한눈에 볼 수 있어요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/")}>
              계산하러 가기
            </Button>
          }
          testId="stats-empty"
        />
      ) : (
        <>
          <SummaryHero
            label="지금까지 낸 금액"
            value={<Amount value={agg.totalAmount} unit="원" typography="t1" testId="stats-total-amount" />}
            testId="stats-hero"
          />

          <Spacing size={16} />

          <Card testId="stats-summary-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Paragraph.Text typography="st11">기록 수</Paragraph.Text>
              <span data-testid="stats-total-count">
                <Paragraph.Text typography="st1">{`${agg.totalCount}건`}</Paragraph.Text>
              </span>
            </div>
            <Spacing size={12} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Paragraph.Text typography="st11">건당 평균</Paragraph.Text>
              <Amount value={agg.avgAmount} unit="원" typography="st1" testId="stats-avg-amount" />
            </div>
          </Card>

          <Spacing size={24} />
          <Border />
          <Spacing size={24} />

          {slotId && !unlocked ? (
            <RewardGate slotId={slotId}>
              <StatsDetail data={agg} eventTypeLabels={EVENT_TYPE_LABEL} />
            </RewardGate>
          ) : (
            <StatsDetail data={agg} eventTypeLabels={EVENT_TYPE_LABEL} />
          )}
        </>
      )}

      <Spacing size={96} />
    </ScreenScaffold>
  );
}
