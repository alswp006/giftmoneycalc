import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Top, ListRow, Border, Spacing } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { ButtonStack } from '@/components/BottomCTA';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { SummaryHero } from '@/components/SummaryHero';
import { ResultBanner } from '@/components/ResultBanner';
import SaveRecordSheet from '@/components/SaveRecordSheet';
import { calculate } from '@/domain/calculate';
import { formatNumber } from '@/lib/utils';
import type { CalculationInput, CalculationResult, RouteState } from '@/lib/types';

/**
 * 결과 화면 — 홈에서 넘어온 입력값으로 추천 금액과 산출 내역을 보여준다.
 *
 * @AI:NOTE location.state가 없으면(새로고침·딥링크) 빈 화면 대신 홈으로 replace 이동한다.
 *   계산 자체도 try/catch로 감싼다 — 손상된 state로 들어와도 흰 화면 대신 홈으로 빠져나간다.
 * @AI:NOTE RouteState의 { recordId } 진입은 아직 쓰이지 않는다. 기록 목록은 비동기로 채워져
 *   첫 렌더에서 항상 비어 있으므로, 조회 없이 리다이렉트하면 정상 진입도 튕긴다 — 지원할 때
 *   로딩 상태를 함께 넣어야 한다.
 */

const RELATION_MULTIPLIER_SUFFIX = '배';

function readInput(state: unknown): CalculationInput | null {
  const routeState = state as RouteState['/result'];
  if (routeState && 'input' in routeState && routeState.input) return routeState.input;
  return null;
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const input = readInput(location.state);

  const result = useMemo<CalculationResult | null>(() => {
    if (!input) return null;
    try {
      return calculate(input);
    } catch {
      // 유효하지 않은 입력(직접 조작된 state) — 아래 이펙트가 홈으로 되돌린다.
      return null;
    }
  }, [input]);

  useEffect(() => {
    if (!result) navigate('/', { replace: true });
  }, [result, navigate]);

  if (!input || !result) return null;

  const { breakdown } = result;
  const mealLabel =
    breakdown.companions > 0 ? `식사비 · 동반 ${breakdown.companions}명` : '식사비';

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>추천 금액</Top.TitleParagraph>} />}
      bottom={
        <ButtonStack
          primary={{ label: '이 금액으로 기록하기', onClick: () => setSheetOpen(true) }}
          secondary={{ label: '다시 계산하기', onClick: () => navigate('/') }}
        />
      }
    >
      <SummaryHero
        label="추천 금액"
        value={<Amount value={result.recommended} unit="원" typography="t1" />}
        caption={breakdown.clamped ? '통념 범위에 맞춰 조정한 금액이에요' : '관계와 상황에 맞게 조절해도 좋아요'}
        testId="result-hero"
      />

      <Spacing size={16} />

      <Card testId="result-breakdown">
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="기본 금액" bottom="행사 유형 기준" />}
          right={<Amount value={breakdown.base} unit="원" typography="t6" />}
        />
        <Border />
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="관계 가중치" bottom="가까울수록 높아져요" />}
          right={<Amount value={breakdown.relationMultiplier} unit={RELATION_MULTIPLIER_SUFFIX} typography="t6" />}
        />
        <Border />
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top={mealLabel} bottom={input.attended ? '참석 기준' : '불참이라 없어요'} />}
          right={<Amount value={breakdown.mealCost} unit="원" typography="t6" />}
        />
        <Border />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="만 원 단위 반올림"
              bottom={`합계 ${formatNumber(breakdown.subtotal)}원`}
            />
          }
          right={<Amount value={breakdown.rounded} unit="원" typography="t6" />}
        />
      </Card>

      <Spacing size={16} />
      <ResultBanner />
      <Spacing size={96} />

      <SaveRecordSheet
        open={sheetOpen}
        record={{
          eventType: input.eventType,
          relation: input.relation,
          recommendedAmount: result.recommended,
          attended: input.attended,
          companions: input.companions,
          eventDate: input.eventDate,
          ruleVersion: result.ruleVersion,
        }}
        onClose={() => setSheetOpen(false)}
        onSaved={(recordId) => {
          setSheetOpen(false);
          navigate(`/history/${recordId}`, { state: { from: 'result' } });
        }}
      />
    </ScreenScaffold>
  );
}
