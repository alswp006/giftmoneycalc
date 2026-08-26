import { Top, Paragraph, Spacing, ListRow, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
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

export default function Home() {
  const navigate = useNavigate();
  const { lastCalc, records } = useStorage();

  const heroValue = lastCalc ? (
    <Amount value={lastCalc.result.recommended} unit="원" typography="t1" />
  ) : (
    <Paragraph.Text typography="t2">관계와 지역까지 반영해 계산해요</Paragraph.Text>
  );

  const heroCaption = lastCalc
    ? `${EVENT_LABEL[lastCalc.input.eventType]} · ${RELATION_LABEL[lastCalc.input.relation]}`
    : `기록 ${records.length}건 · 로그인 없이 바로 써요`;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>축의금 계산기</Top.TitleParagraph>} />}
    >
      <SummaryHero
        label={lastCalc ? '최근 계산한 금액' : '얼마가 적당할까'}
        value={heroValue}
        caption={heroCaption}
        action={
          lastCalc ? (
            <Button
              variant="weak"
              display="block"
              onClick={() => navigate('/result', { state: { input: lastCalc.input } })}
            >
              최근 결과 다시 보기
            </Button>
          ) : undefined
        }
        testId="home-hero"
      />

      <Spacing size={24} />

      <Card testId="home-highlights">
        <Paragraph.Text typography="t5">어떤 경조사인가요?</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="st12">고르면 바로 금액 계산으로 넘어가요</Paragraph.Text>
        <Spacing size={8} />
        {eventTypeOptions.map((option) => (
          <ListRow
            key={option.value}
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={option.label}
                bottom={EVENT_HINT[option.value]}
              />
            }
            onClick={() => navigate('/calc', { state: { eventType: option.value } })}
          />
        ))}
      </Card>

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
