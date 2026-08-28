import { useEffect, useMemo, useState } from 'react';
import { Top, Paragraph, Spacing, ListRow, Button, Toast } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import { Amount } from '@/components/Amount';
import { Card } from '@/components/Card';
import { EmptyState, LoadingState } from '@/components/StateView';
import { AdSlot } from '@/components/AdSlot';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useRecords } from '@/hooks/useRecords';
import { NAV_TABS } from '@/lib/nav';
import { getErrorMessage } from '@/lib/errors';
import { EVENT_TYPE_LABEL } from '@/lib/rules';
import type { EventType, GiftRecord, RouteState } from '@/lib/types';

const QUICK_EVENTS: EventType[] = ['wedding', 'funeral', 'firstBirthday'];

function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function safeHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Home() {
  const navigate = useNavigate();
  const { records, loading } = useRecords();
  const [toastOpen, setToastOpen] = useState(false);

  const { monthTotal, monthCount, recent, hadError } = useMemo(() => {
    try {
      const monthKey = currentMonthKey();
      const monthRecords = records.filter((r) => r.eventDate.slice(0, 7) === monthKey);
      const total = monthRecords.reduce((sum, r) => sum + r.amount, 0);
      return { monthTotal: total, monthCount: monthRecords.length, recent: records.slice(0, 3), hadError: false };
    } catch {
      return { monthTotal: 0, monthCount: 0, recent: [] as GiftRecord[], hadError: true };
    }
  }, [records]);

  useEffect(() => {
    if (hadError) setToastOpen(true);
  }, [hadError]);

  const goCalc = () => {
    safeHaptic('success');
    navigate('/calc');
  };

  const goCalcWithEvent = (eventType: EventType) => {
    safeHaptic('tickWeak');
    navigate('/calc', { state: { prefill: { eventType } } as RouteState['/calc'] });
  };

  const goDetail = (id: string) => {
    navigate('/history/' + id);
  };

  const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>경조사비 계산기</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={NAV_TABS} />}
    >
      <SummaryHero
        label="이번 달 경조사비"
        value={<CountUp value={monthTotal} unit="원" typography="t1" />}
        caption={`${monthCount}건 기록했어요`}
        testId="home-hero"
      />

      <Spacing size={12} />

      <Button variant="fill" display="block" size="large" onClick={goCalc}>
        권장 금액 계산하기
      </Button>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">바로 계산</Paragraph.Text>
      <Spacing size={12} />
      {/* TDS Chip은 칩 '그룹 컨테이너'(div)라 안에 라벨을 직접 넣으면 알약 없이 맨 텍스트로
          렌더된다 — 선택형 알약은 weak Button으로 만든다. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_EVENTS.map((type) => (
          <Button
            key={type}
            variant="weak"
            size="small"
            display="inline"
            onClick={() => goCalcWithEvent(type)}
          >
            {EVENT_TYPE_LABEL[type]}
          </Button>
        ))}
      </div>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">최근 기록</Paragraph.Text>
      <Spacing size={12} />
      {loading ? (
        <LoadingState rows={3} testId="home-recent-loading" />
      ) : recent.length === 0 ? (
        <EmptyState
          testId="home-recent-empty"
          title="아직 기록이 없어요"
          description="계산하고 바로 기록해 보세요"
          action={
            <Button variant="weak" display="block" onClick={goCalc}>
              계산하기
            </Button>
          }
        />
      ) : (
        <Card testId="home-recent-card">
          {recent.map((r, idx) => (
            <div key={r.id}>
              {idx > 0 ? <Spacing size={8} /> : null}
              <ListRow
                data-testid="home-recent-record"
                data-record-id={r.id}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${r.personName} · ${EVENT_TYPE_LABEL[r.eventType]}`}
                    bottom={r.eventDate.replace(/-/g, '.')}
                  />
                }
                right={<Amount value={r.amount} unit="원" typography="st11" />}
                onClick={() => goDetail(r.id)}
              />
            </div>
          ))}
        </Card>
      )}

      <Spacing size={16} />
      {adGroupId ? <AdSlot adGroupId={adGroupId} /> : null}
      <Spacing size={80} />

      <Toast
        open={toastOpen}
        position="bottom"
        text={getErrorMessage(500)}
        onClose={() => setToastOpen(false)}
      />
    </ScreenScaffold>
  );
}
