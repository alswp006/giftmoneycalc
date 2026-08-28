import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Paragraph, Spacing, Chip, Toast } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { SubmitFooter } from '@/components/BottomCTA';
import { formatNumber } from '@/lib/utils';
import { EVENT_TYPE_LABEL, RELATIONSHIP_LABEL } from '@/lib/rules';
import type { RouteState } from '@/lib/types';

const COPY_SUCCESS_MESSAGE = '결과를 복사했어요';
const COPY_FAIL_MESSAGE = '복사에 실패했어요. 화면을 캡처해 공유해주세요';

export default function Share() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RouteState['/share'];
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const { input, result } = state;
  const { recommendedAmount, rangeMin, rangeMax } = result;

  const handleCopy = async () => {
    const text = `${EVENT_TYPE_LABEL[input.eventType]} · ${RELATIONSHIP_LABEL[input.relationship]}\n권장 금액 ${formatNumber(recommendedAmount)}원 (${formatNumber(rangeMin)}원~${formatNumber(rangeMax)}원)`;
    try {
      await navigator.clipboard.writeText(text);
      setToast(COPY_SUCCESS_MESSAGE);
    } catch {
      setToast(COPY_FAIL_MESSAGE);
    }
  };

  return (
    <ScreenScaffold
      top={
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 0' }}>
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={() => navigate(-1)}
            style={{
              minWidth: 44,
              minHeight: 44,
              border: 'none',
              background: 'transparent',
              color: 'var(--adaptiveGrey900)',
              fontSize: 20,
            }}
          >
            ‹
          </button>
          <Paragraph.Text typography="t5">공유 카드</Paragraph.Text>
        </div>
      }
      bottom={<SubmitFooter label="결과 복사하기" onClick={handleCopy} />}
    >
      <Card
        testId="share-card"
        style={{
          aspectRatio: '3 / 4',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Chip variant="weak">{EVENT_TYPE_LABEL[input.eventType]}</Chip>
          <Chip variant="weak">{RELATIONSHIP_LABEL[input.relationship]}</Chip>
        </div>

        <Amount value={recommendedAmount} unit="원" typography="t1" />

        <Paragraph.Text typography="st3">
          {formatNumber(rangeMin)}원~{formatNumber(rangeMax)}원
        </Paragraph.Text>

        <Paragraph.Text typography="st13">참고용 권장 금액이에요</Paragraph.Text>
      </Card>

      <Spacing size={80} />

      <Toast
        open={!!toast}
        text={toast ?? ''}
        position="bottom"
        onClose={() => setToast(null)}
      />
    </ScreenScaffold>
  );
}
