import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Chip, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import { Card } from '@/components/Card';
import { SubmitFooter } from '@/components/BottomCTA';
import { calculate } from '@/lib/calc';
import { formatNumber } from '@/lib/utils';
import { EVENT_TYPE_LABEL, RELATIONSHIP_LABEL } from '@/lib/rules';
import type { RouteState } from '@/lib/types';

function safeHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RouteState['/result'];

  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const { input } = state;
  const result = calculate(input);
  const { recommendedAmount, rangeMin, rangeMax, reasons } = result;

  const goHistory = () => {
    safeHaptic('success');
    navigate('/history', {
      state: { prefill: { ...input, recommendedAmount } } as RouteState['/history'],
    });
  };

  const goShare = () => {
    safeHaptic('tickWeak');
    navigate('/share', { state: { input, result } as RouteState['/share'] });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>권장 금액</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="기록에 추가하기" onClick={goHistory} />}
    >
      <SummaryHero
        testId="result-hero"
        label="이 자리엔"
        value={<CountUp value={recommendedAmount} unit="원" typography="t1" />}
        caption={`보통 ${formatNumber(rangeMin)}원~${formatNumber(rangeMax)}원 사이예요`}
      />

      <Spacing size={16} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Chip variant="weak">{EVENT_TYPE_LABEL[input.eventType]}</Chip>
        <Chip variant="weak">{RELATIONSHIP_LABEL[input.relationship]}</Chip>
      </div>

      <Spacing size={24} />
      <Paragraph.Text typography="t4">이렇게 계산했어요</Paragraph.Text>
      <Spacing size={12} />
      <Card>
        {reasons.map((reason, idx) => (
          <div key={reason}>
            {idx > 0 ? <Spacing size={8} /> : null}
            <ListRow contents={<ListRow.Texts type="1RowTypeA" top={reason} />} />
          </div>
        ))}
      </Card>

      <Spacing size={16} />
      <Button variant="weak" display="block" size="large" onClick={goShare}>
        공유 카드 만들기
      </Button>

      <Spacing size={80} />
    </ScreenScaffold>
  );
}
