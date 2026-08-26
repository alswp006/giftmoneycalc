import { Paragraph, Spacing, ListRow } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { Sparkline } from "@/components/Sparkline";
import { EVENT_LABEL } from "@/lib/constants";
import { formatKRW } from "@/lib/format";
import type { EventType } from "@/lib/types";

const EVENT_TYPES = Object.keys(EVENT_LABEL) as EventType[];

/**
 * 상세 통계 리포트 — 리워드 게이트 해제 후에만 렌더된다(RewardGate children).
 *
 * Pre-built 아님, 이 화면 전용: 유형별 합계 MiniBar + 월별 추이 Sparkline(2개월 이상일 때만).
 */
export function StatsDetail({
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
