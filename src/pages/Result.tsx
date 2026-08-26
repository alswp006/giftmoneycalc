import { useEffect, useMemo } from "react";
import { Top, Paragraph, Spacing, ListRow } from "@toss/tds-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { ButtonStack } from "../components/BottomCTA";
import { SummaryHero } from "../components/SummaryHero";
import { Card } from "../components/Card";
import { Amount } from "../components/Amount";
import { LoadingState } from "../components/StateView";
import { useStorage } from "../store/StorageProvider";
import { calcGiftAmount } from "../lib/calc";
import { formatKRW } from "../lib/format";
import { ATTENDANCE_LABEL, EVENT_LABEL, RELATION_LABEL } from "../lib/constants";
import type { CalcInput } from "../lib/types";

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, lastCalc } = useStorage();

  const incoming = (location.state ?? null) as { input?: CalcInput } | null;
  const input = incoming?.input ?? lastCalc?.input ?? null;

  // 새로고침·딥링크로 들어와 조건이 없으면 계산 화면으로 되돌린다(막다른 길 방지).
  useEffect(() => {
    if (ready && input == null) navigate("/calc", { replace: true });
  }, [ready, input, navigate]);

  const result = useMemo(() => (input ? calcGiftAmount(input) : null), [input]);

  if (!input || !result) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>계산 결과</Top.TitleParagraph>} />}>
        <LoadingState rows={3} />
      </ScreenScaffold>
    );
  }

  const summary = `${EVENT_LABEL[input.eventType]} · ${RELATION_LABEL[input.relation]} · ${
    ATTENDANCE_LABEL[input.attendance]
  }`;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>계산 결과</Top.TitleParagraph>} />}
      bottom={
        <ButtonStack
          primary={{
            label: "이 금액으로 기록하기",
            onClick: () =>
              navigate("/record/new", {
                state: {
                  prefill: {
                    eventType: input.eventType,
                    relation: input.relation,
                    amount: result.recommended,
                  },
                },
              }),
          }}
          secondary={{
            label: "공유 카드 만들기",
            onClick: () => navigate("/share", { state: { result } }),
          }}
        />
      }
    >
      <SummaryHero
        label="추천 금액"
        value={<Amount value={result.recommended} unit="원" typography="t1" />}
        caption={summary}
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
          contents={<ListRow.Texts type="1RowTypeA" top={item.label} />}
          right={<Paragraph.Text typography="st11">×{item.factor}</Paragraph.Text>}
        />
      ))}

      <Spacing size={12} />
      <Paragraph.Text typography="st12">
        관례 기준 참고값입니다. 실제 금액은 개인 상황에 따라 달라질 수 있어요.
      </Paragraph.Text>
      <Spacing size={140} />
    </ScreenScaffold>
  );
}
