import { useMemo } from 'react';
import { Top, Paragraph, Spacing, Button, Skeleton } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import { Amount } from '@/components/Amount';
import { Card } from '@/components/Card';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState, EmptyIcon } from '@/components/StateView';
import { AdSlot } from '@/components/AdSlot';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useRecords } from '@/hooks/useRecords';
import { aggregate } from '@/lib/stats';
import { NAV_TABS } from '@/lib/nav';
import { EVENT_TYPE_LABEL, RELATIONSHIP_LABEL } from '@/lib/rules';
import type { RouteState } from '@/lib/types';

export default function Stats() {
  const navigate = useNavigate();
  const { records, loading } = useRecords();

  const summary = useMemo(() => aggregate(records, Date.now()), [records]);

  const goAddRecord = () => {
    navigate('/history', { state: { prefill: null } as RouteState['/history'] });
  };

  const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>통계</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={NAV_TABS} />}
    >
      {loading ? (
        <>
          <Card>
            <div style={{ height: 88 }}>
              <Skeleton />
            </div>
          </Card>
          <Spacing size={12} />
          <Card>
            <div style={{ height: 88 }}>
              <Skeleton />
            </div>
          </Card>
          <Spacing size={12} />
          <Card>
            <div style={{ height: 88 }}>
              <Skeleton />
            </div>
          </Card>
        </>
      ) : records.length === 0 ? (
        <EmptyState
          testId="stats-empty"
          icon={<EmptyIcon label="기록 없음" />}
          title="기록이 없어 통계를 만들 수 없어요"
          description="첫 경조사비 기록을 남기면 통계가 만들어져요"
          action={
            <Button variant="weak" display="block" onClick={goAddRecord}>
              기록 추가하러 가기
            </Button>
          }
        />
      ) : (
        <>
          <SummaryHero
            label="총 지출"
            value={<CountUp value={summary.totalAmount} unit="원" typography="t1" />}
            caption={`${summary.count}건 기록했어요`}
            testId="stats-hero"
          />

          <Spacing size={12} />

          <Card testId="stat-card">
            <Paragraph.Text typography="t5">요약 지표</Paragraph.Text>
            <Spacing size={12} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Paragraph.Text typography="st11">총 건수</Paragraph.Text>
              <Paragraph.Text typography="st11">{summary.count}건</Paragraph.Text>
            </div>
            <Spacing size={8} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Paragraph.Text typography="st11">평균 금액</Paragraph.Text>
              <Amount value={Math.round(summary.avgAmount)} unit="원" typography="st11" />
            </div>
            <Spacing size={8} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Paragraph.Text typography="st11">최다 관계</Paragraph.Text>
              <Paragraph.Text typography="st11">
                {summary.topRelationship ? RELATIONSHIP_LABEL[summary.topRelationship] : '-'}
              </Paragraph.Text>
            </div>
          </Card>

          <Spacing size={12} />

          <Card testId="stat-card">
            <Paragraph.Text typography="t5">행사 유형 비중</Paragraph.Text>
            <Spacing size={12} />
            {summary.byEventType.map((item, idx) => (
              <div key={item.type}>
                {idx > 0 ? <Spacing size={12} /> : null}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Paragraph.Text typography="st11">{EVENT_TYPE_LABEL[item.type]}</Paragraph.Text>
                  <Paragraph.Text typography="st11">{Math.round(item.ratio * 100)}%</Paragraph.Text>
                </div>
                <Spacing size={4} />
                <MiniBar ratio={item.ratio} />
              </div>
            ))}
          </Card>

          <Spacing size={16} />
          {adGroupId ? <AdSlot adGroupId={adGroupId} /> : null}
        </>
      )}

      <Spacing size={80} />
    </ScreenScaffold>
  );
}
