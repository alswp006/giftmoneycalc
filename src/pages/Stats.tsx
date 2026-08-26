import { useMemo } from "react";
import { Top, Paragraph, Spacing } from "@toss/tds-mobile";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { SummaryHero } from "../components/SummaryHero";
import { Card } from "../components/Card";
import { Amount } from "../components/Amount";
import { StatsDetail } from "../components/StatsDetail";
import { EmptyState, LoadingState } from "../components/StateView";
import { RewardGate } from "../components/RewardGate";
import { useStorage } from "../store/StorageProvider";
import { useStatsUnlock } from "../hooks/useStatsUnlock";
import { aggregateStats } from "../lib/stats";
import { formatKRW } from "../lib/format";
import { MIN_STATS_RECORDS } from "../lib/constants";

export default function Stats() {
  const { ready, records } = useStorage();
  const { unlocked, unlockStats } = useStatsUnlock();
  const stats = useMemo(() => aggregateStats(records), [records]);

  const enoughRecords = records.length >= MIN_STATS_RECORDS;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>통계</Top.TitleParagraph>} />}>
      <SummaryHero
        label="지금까지 낸 경조사비"
        value={<Amount value={stats.totalGiven} unit="원" typography="t1" />}
        caption={`받은 금액 ${formatKRW(stats.totalReceived)} · 기록 ${stats.count}건`}
        testId="stats-hero"
      />

      <Spacing size={16} />

      {!ready ? (
        <LoadingState rows={3} testId="stats-loading" />
      ) : records.length === 0 ? (
        <EmptyState
          title="아직 통계가 없어요"
          description="기록을 남기면 지출 흐름을 볼 수 있어요"
          testId="stats-empty"
        />
      ) : !enoughRecords ? (
        <Card testId="stats-locked">
          <Paragraph.Text typography="st11">
            기록이 {MIN_STATS_RECORDS}건 이상 쌓이면 상세 리포트를 볼 수 있어요
          </Paragraph.Text>
        </Card>
      ) : (
        <RewardGate
          unlocked={unlocked}
          onUnlocked={unlockStats}
          buttonText="광고 보고 리포트 열기"
          description="광고를 보면 상세 리포트를 24시간 동안 볼 수 있어요"
        >
          <StatsDetail
            byEventType={stats.byEventType}
            byMonth={stats.byMonth}
            averageAmount={stats.averageAmount}
          />
        </RewardGate>
      )}

      <Spacing size={16} />
      <Paragraph.Text typography="st12">기록한 금액만 집계해요</Paragraph.Text>
      <Spacing size={24} />
    </ScreenScaffold>
  );
}
