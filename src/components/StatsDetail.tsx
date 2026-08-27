import { Paragraph, Spacing } from "@toss/tds-mobile";
import { MiniBar } from "@/components/MiniBar";
import { Sparkline } from "@/components/Sparkline";
import type { AggregateResult } from "@/domain/aggregate";

export type StatsDetailProps = {
  data: AggregateResult;
  eventTypeLabels?: Record<string, string>;
};

function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function StatsDetail({ data, eventTypeLabels }: StatsDetailProps) {
  const rows = Object.entries(data.byEventType)
    .map(([type, bucket]) => ({
      type,
      label: eventTypeLabels?.[type] ?? type,
      ...bucket,
      ratio: data.totalAmount === 0 ? 0 : bucket.sum / data.totalAmount,
    }))
    .sort((a, b) => b.sum - a.sum);

  const recentMonths = data.monthly.slice(-6);

  return (
    <div data-testid="stats-detail">
      <Paragraph.Text typography="t4">유형별로 얼마나 냈을까요</Paragraph.Text>
      <Spacing size={12} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((row) => (
          <div
            key={row.type}
            data-testid="stats-type-row"
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Paragraph.Text typography="st1">{row.label}</Paragraph.Text>
              <Paragraph.Text typography="st1">
                {formatWon(row.sum)} · {Math.round(row.ratio * 100)}%
              </Paragraph.Text>
            </div>
            <MiniBar ratio={row.ratio} testId={`stats-bar-${row.type}`} />
          </div>
        ))}
      </div>
      <Spacing size={24} />
      <div style={{ borderTop: "1px solid var(--adaptiveGrey100)" }} />
      <Spacing size={24} />
      <Paragraph.Text typography="t4">최근 6개월 추이</Paragraph.Text>
      <Spacing size={12} />
      {recentMonths.length >= 2 ? (
        <Sparkline data={recentMonths.map((m) => m.sum)} testId="stats-trend" />
      ) : (
        <svg
          data-testid="stats-trend"
          viewBox="0 0 300 80"
          style={{ width: "100%", height: 80 }}
          role="img"
          aria-label="추이 그래프"
        >
          <line x1={0} y1={40} x2={300} y2={40} stroke="var(--adaptiveGrey100)" strokeWidth={1} />
          {recentMonths.length === 1 && <circle cx={150} cy={40} r={4} fill="var(--adaptiveBlue500)" />}
        </svg>
      )}
    </div>
  );
}
