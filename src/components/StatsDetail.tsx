import { Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { Amount } from "@/components/Amount";
import { Sparkline } from "@/components/Sparkline";
import { RewardGate } from "@/components/RewardGate";
import type { EventType, Relationship, StatsSummary } from "@/lib/types";

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  wedding: "결혼식",
  funeral: "장례식",
  firstBirthday: "돌잔치",
  etc: "기타",
};

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  parents: "부모님",
  siblings: "형제/자매",
  spouse: "배우자",
  children: "자녀",
  relatives: "친척",
  friends: "친구",
  colleagues: "동료",
  boss: "상사",
  acquaintance: "지인",
};

function LockedPreview() {
  return (
    <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }} aria-hidden="true">
      <Paragraph.Text typography="st13">최대 지출 월</Paragraph.Text>
      <Spacing size={8} />
      <MiniBar ratio={0.6} />
      <Spacing size={16} />
      <Paragraph.Text typography="st13">행사 유형별 비중</Paragraph.Text>
      <Spacing size={8} />
      <MiniBar ratio={0.4} />
    </div>
  );
}

interface StatsDetailProps {
  summary: StatsSummary;
}

export function StatsDetail({ summary }: StatsDetailProps) {
  const trendValues = summary.monthlyTrend.map((m) => m.amount);
  const maxMonth = summary.monthlyTrend.reduce<{ month: string; amount: number } | null>(
    (max, cur) => (max === null || cur.amount > max.amount ? cur : max),
    null,
  );

  return (
    <RewardGate lockedPreview={<LockedPreview />}>
      <Paragraph.Text typography="t4">월별 추이</Paragraph.Text>
      <Spacing size={8} />
      <Sparkline data={trendValues} testId="trend-sparkline" />
      <Spacing size={16} />
      <Card testId="detail-stats">
        <Paragraph.Text typography="st13">최대 지출 월</Paragraph.Text>
        <Spacing size={4} />
        {maxMonth ? (
          <>
            <Paragraph.Text typography="st13">{maxMonth.month}</Paragraph.Text>
            <Amount value={maxMonth.amount} />
          </>
        ) : (
          <Paragraph.Text typography="st13">기록이 없어요</Paragraph.Text>
        )}

        <Spacing size={16} />
        <Paragraph.Text typography="st13">건당 평균 금액</Paragraph.Text>
        <Spacing size={4} />
        <Amount value={summary.avgAmount} />

        <Spacing size={16} />
        <Paragraph.Text typography="st13">행사 유형별 평균</Paragraph.Text>
        <Spacing size={4} />
        {summary.byEventType.map((item) => (
          <div key={item.type} style={{ marginBottom: 8 }}>
            <Paragraph.Text typography="st13">{EVENT_TYPE_LABEL[item.type]}</Paragraph.Text>
            <Amount value={item.amount} />
            <Spacing size={4} />
            <MiniBar ratio={item.ratio} />
          </div>
        ))}

        <Spacing size={16} />
        <Paragraph.Text typography="st13">가장 많이 챙긴 관계</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="st13">
          {summary.topRelationship ? RELATIONSHIP_LABEL[summary.topRelationship] : "기록이 없어요"}
        </Paragraph.Text>
      </Card>
    </RewardGate>
  );
}
