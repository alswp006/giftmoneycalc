import { Paragraph, Spacing, ListRow, Chip } from "@toss/tds-mobile";
import { SummaryHero } from "./SummaryHero";
import { Card } from "./Card";
import { CountUp } from "./CountUp";
import { formatKRW } from "../lib/format";
import { ATTENDANCE_LABEL, EVENT_LABEL, RELATION_LABEL } from "../lib/constants";
import type { CalcResult } from "../lib/types";

export function ResultContent({ result }: { result: CalcResult }) {
  const { input } = result;

  return (
    <>
      <SummaryHero
        label="추천 금액"
        value={<CountUp value={result.recommended} unit="원" typography="t1" durationMs={600} />}
        caption={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip variant="fill">{EVENT_LABEL[input.eventType]}</Chip>
            <Chip variant="weak">{RELATION_LABEL[input.relation]}</Chip>
            <Chip variant="weak">{ATTENDANCE_LABEL[input.attendance]}</Chip>
          </div>
        }
        testId="recommend-hero"
      />

      <Spacing size={16} />

      <Card testId="range-card">
        <Paragraph.Text typography="st11">적정 범위</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t4">
          {formatKRW(result.min)} ~ {formatKRW(result.max)}
        </Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <Paragraph.Text typography="t5">이렇게 계산했어요</Paragraph.Text>
      <Spacing size={8} />
      {result.breakdown.map((item) => (
        <ListRow
          key={item.label}
          aria-label={`${item.label} ×${item.factor}`}
          contents={<ListRow.Texts type="1RowTypeA" top={item.label} />}
          right={<Paragraph.Text typography="st11">×{item.factor}</Paragraph.Text>}
        />
      ))}

      <Spacing size={12} />
      <Paragraph.Text typography="st12">
        관례 기준 참고값입니다. 실제 금액은 개인 상황에 따라 달라질 수 있어요.
      </Paragraph.Text>
      <Spacing size={140} />
    </>
  );
}
