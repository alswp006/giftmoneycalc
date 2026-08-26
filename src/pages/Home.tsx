import { Top, Paragraph, Spacing, ListRow, Skeleton, Toast } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { EmptyState } from '../components/StateView';
import { AdSlot } from '../components/AdSlot';
import { Amount } from '../components/Amount';
import { useStorage } from '../store/StorageProvider';
import { eventTypeOptions } from '../lib/options';
import { EVENT_LABEL, RELATION_LABEL } from '../lib/constants';
import type { EventType } from '../lib/types';

const EVENT_HINT: Record<EventType, string> = {
  wedding: '축의금 계산하기',
  funeral: '부의금 계산하기',
  firstBirthday: '축하금 계산하기',
  opening: '축하금 계산하기',
};

const AD_GROUP_ID: string = import.meta.env.VITE_TOSS_AD_GROUP_ID ?? '';

function tickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function Home() {
  const navigate = useNavigate();
  const { ready, loadError, lastCalc } = useStorage();

  function goToCalc(eventType: EventType) {
    tickWeak();
    navigate('/calc', { state: { eventType } });
  }

  function goToLastCalcResult() {
    if (!lastCalc) return;
    tickWeak();
    navigate('/result', { state: { input: lastCalc.input } });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>축의금 계산기</Top.TitleParagraph>} />}
    >
      <div data-testid="home-highlights">
        <Paragraph.Text typography="t5">어떤 경조사인가요?</Paragraph.Text>
        <Spacing size={12} />

        {!ready ? (
          <div
            data-testid="home-types-loading"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : (
          eventTypeOptions.map((option) => (
            <ListRow
              key={option.value}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={option.label}
                  bottom={EVENT_HINT[option.value]}
                />
              }
              onClick={() => goToCalc(option.value)}
            />
          ))
        )}
      </div>

      <Spacing size={16} />

      <div data-testid="home-hero">
        {!ready ? (
          <div data-testid="home-hero-loading">
            <Skeleton />
          </div>
        ) : lastCalc ? (
          <>
            <SummaryHero
              testId="last-calc-card"
              label="최근 계산한 금액"
              value={<Amount value={lastCalc.result.recommended} unit="원" typography="t1" />}
              caption={`${EVENT_LABEL[lastCalc.input.eventType]} · ${RELATION_LABEL[lastCalc.input.relation]}`}
              onClick={goToLastCalcResult}
            />
            <Spacing size={16} />
            <AdSlot adGroupId={AD_GROUP_ID} />
          </>
        ) : (
          <>
            <EmptyState
              title="첫 계산을 시작해보세요"
              description="유형을 고르면 바로 계산해요"
            />
            <Spacing size={16} />
            <AdSlot adGroupId={AD_GROUP_ID} />
          </>
        )}
      </div>

      <Spacing size={16} />

      <Toast
        open={loadError}
        position="bottom"
        text="저장된 데이터를 불러오지 못했어요"
      />
    </ScreenScaffold>
  );
}
