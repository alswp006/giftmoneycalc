import { useMemo } from "react";
import { Top, Paragraph, Spacing, ListRow, Button } from "@toss/tds-mobile";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { SummaryHero } from "../components/SummaryHero";
import { Card } from "../components/Card";
import { Amount } from "../components/Amount";
import { MiniBar } from "../components/MiniBar";
import { Sparkline } from "../components/Sparkline";
import { EmptyState, LoadingState } from "../components/StateView";
import { TossRewardAd } from "../components/TossRewardAd";
import { useStorage } from "../store/StorageProvider";
import { aggregateStats } from "../lib/stats";
import { formatKRW } from "../lib/format";
import { EVENT_LABEL, MIN_STATS_RECORDS } from "../lib/constants";
import type { EventType } from "../lib/types";

const EVENT_TYPES = Object.keys(EVENT_LABEL) as EventType[];

function StatsDetail({
  byEventType,
  byMonth,
  averageAmount,
}: {
  byEventType: Record<EventType, number>;
  byMonth: Record<string, number>;
  averageAmount: number;
}) {
  const max = Math.max(...EVENT_TYPES.map((type) => byEventType[type]), 1);
  const months = Object.keys(byMonth).sort();
  const trend = months.map((month) => byMonth[month]);

  return (
    <Card testId="stats-detail">
      <Paragraph.Text typography="t5">유형별로 얼마나 썼는지</Paragraph.Text>
      <Spacing size={12} />
      {EVENT_TYPES.map((type) => (
        <div key={type}>
          <ListRow
            contents={<ListRow.Texts type="1RowTypeA" top={EVENT_LABEL[type]} />}
            right={<Paragraph.Text typography="t6">{formatKRW(byEventType[type])}</Paragraph.Text>}
          />
          <MiniBar ratio={byEventType[type] / max} />
          <Spacing size={8} />
        </div>
      ))}
      {trend.length >= 2 && (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="t5">월별 흐름</Paragraph.Text>
          <Spacing size={8} />
          <Sparkline data={trend} testId="stats-trend" />
          <Spacing size={4} />
          <Paragraph.Text typography="st12">
            {months[0]} ~ {months[months.length - 1]}
          </Paragraph.Text>
        </>
      )}
      <Spacing size={8} />
      <ListRow
        contents={<ListRow.Texts type="1RowTypeA" top="건당 평균" />}
        right={
          <Paragraph.Text typography="t6">{formatKRW(Math.round(averageAmount))}</Paragraph.Text>
        }
      />
    </Card>
  );
}

export default function Stats() {
  const { ready, records, rewardUnlock, unlockStats } = useStorage();
  const stats = useMemo(() => aggregateStats(records), [records]);

  const unlocked = rewardUnlock.statsUnlockedUntil > Date.now();
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
      ) : unlocked ? (
        <StatsDetail
          byEventType={stats.byEventType}
          byMonth={stats.byMonth}
          averageAmount={stats.averageAmount}
        />
      ) : (
        <TossRewardAd
          slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "stats-detail"}
          description="광고를 보면 상세 리포트를 24시간 동안 볼 수 있어요"
          buttonText="광고 보고 리포트 열기"
          onRewarded={unlockStats}
        >
          <StatsDetail
            byEventType={stats.byEventType}
            byMonth={stats.byMonth}
            averageAmount={stats.averageAmount}
          />
        </TossRewardAd>
      )}

      <Spacing size={16} />
      <Paragraph.Text typography="st12">기록한 금액만 집계해요</Paragraph.Text>
      <Spacing size={24} />
    </ScreenScaffold>
  );
}
