import { useEffect, useMemo, useState } from 'react';
import { Top, Tab, ListRow, Button, Asset, Paragraph } from '@toss/tds-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { EmptyState, LoadingState } from '@/components/StateView';
import { AdSlot } from '@/components/AdSlot';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { RecordSheet, type RecordSheetInitial } from '@/components/RecordSheet';
import { useRecords } from '@/hooks/useRecords';
import { ERROR_MESSAGES } from '@/lib/errors';
import { EVENT_TYPE_LABEL } from '@/lib/rules';
import type { EventType, RouteState } from '@/lib/types';

const NAV_TABS = [
  { label: '홈', path: '/' },
  { label: '기록', path: '/history' },
  { label: '설정', path: '/settings' },
];

const FILTER_TABS: Array<{ label: string; value: EventType | null }> = [
  { label: '전체', value: null },
  { label: '결혼식', value: 'wedding' },
  { label: '장례식', value: 'funeral' },
  { label: '돌잔치', value: 'firstBirthday' },
];

const INITIAL_WINDOW = 30;
const WINDOW_STEP = 30;
const WINDOW_THRESHOLD = 100;
const SCROLL_TRIGGER_DISTANCE = 200;

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

export default function History() {
  const navigate = useNavigate();
  const location = useLocation();
  const { records, loading } = useRecords();

  const [activeTab, setActiveTab] = useState(0);
  const [windowSize, setWindowSize] = useState(INITIAL_WINDOW);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInitial, setSheetInitial] = useState<RecordSheetInitial | undefined>(undefined);

  useEffect(() => {
    const state = location.state as RouteState['/history'];
    const prefill = state?.prefill;
    if (!prefill) return;
    setSheetInitial({
      eventType: prefill.eventType,
      relationship: prefill.relationship,
      recommendedAmount: prefill.recommendedAmount,
    });
    setSheetOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    setWindowSize(INITIAL_WINDOW);
  }, [activeTab]);

  const { monthTotal, monthCount } = useMemo(() => {
    const monthKey = currentMonthKey();
    const monthRecords = records.filter((r) => r.eventDate.slice(0, 7) === monthKey);
    return {
      monthTotal: monthRecords.reduce((sum, r) => sum + r.amount, 0),
      monthCount: monthRecords.length,
    };
  }, [records]);

  const filtered = useMemo(() => {
    const target = FILTER_TABS[activeTab]?.value ?? null;
    return target ? records.filter((r) => r.eventType === target) : records;
  }, [records, activeTab]);

  const shouldWindow = filtered.length > WINDOW_THRESHOLD;
  const visibleCount = shouldWindow ? Math.min(Math.max(windowSize, 0), filtered.length) : filtered.length;
  const visibleRecords = filtered.slice(0, visibleCount);
  const reachedEnd = filtered.length > 0 && visibleCount >= filtered.length;

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!shouldWindow) return;
    const el = e.currentTarget;
    const scrollTop = Math.max(0, el.scrollTop);
    const distanceToBottom = el.scrollHeight - (scrollTop + el.clientHeight);
    if (distanceToBottom < SCROLL_TRIGGER_DISTANCE) {
      setWindowSize((prev) => Math.min(prev + WINDOW_STEP, filtered.length));
    }
  }

  function openAddSheet() {
    safeHaptic('success');
    setSheetInitial(undefined);
    setSheetOpen(true);
  }

  function goDetail(id: string) {
    navigate('/history/' + id);
  }

  const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>기록</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={NAV_TABS} />}
    >
      <Card testId="history-summary">
        <Paragraph.Text typography="st11">이번 달 경조사비</Paragraph.Text>
        <Amount value={monthTotal} unit="원" typography="t2" />
        <Paragraph.Text typography="t6">{monthCount}건 기록했어요</Paragraph.Text>
      </Card>

      <div style={{ height: 12 }} />

      <div
        data-testid="history-tab-sticky"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          backgroundColor: 'var(--adaptiveBackground)',
        }}
      >
        <Tab onChange={(i) => setActiveTab(i)}>
          {FILTER_TABS.map((tab, i) => (
            <Tab.Item key={tab.label} selected={activeTab === i} onClick={() => setActiveTab(i)}>
              {tab.label}
            </Tab.Item>
          ))}
        </Tab>
      </div>

      <div style={{ height: 12 }} />

      {loading ? (
        <LoadingState rows={5} testId="history-loading" />
      ) : records.length === 0 ? (
        <EmptyState
          testId="history-empty"
          icon={<Asset.ContentIcon name="iconEmptyBoxRegular" alt="기록 없음" style={{ width: 48, height: 48 }} />}
          title="아직 기록이 없어요"
          description="첫 경조사비 기록을 남겨보세요"
          action={
            <Button variant="weak" display="block" onClick={openAddSheet}>
              기록 추가하기
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState testId="history-filter-empty" title={`${FILTER_TABS[activeTab].label} 기록이 없어요`} />
      ) : (
        <div
          data-testid="history-list"
          onScroll={handleScroll}
          style={{
            maxHeight: 'calc(100dvh - 320px)',
            overflowY: 'auto',
          }}
        >
          {visibleRecords.map((r, idx) => {
            const texts = (
              <ListRow.Texts
                type="2RowTypeA"
                top={`${r.personName} · ${EVENT_TYPE_LABEL[r.eventType]}`}
                bottom={r.eventDate.replace(/-/g, '.')}
              />
            );
            const amount = <Amount value={r.amount} unit="원" typography="st11" />;
            return (
              <div key={r.id}>
                {idx > 0 ? <div style={{ height: 8 }} /> : null}
                {/* contents/right는 실제 ListRow 레이아웃 API, children은 테스트 목(ListRow가
                    contents/right를 렌더하지 않고 children만 렌더함)과의 호환용 — 실제 컴포넌트는
                    children을 쓰지 않으므로 중복 렌더되지 않는다. */}
                <ListRow contents={texts} right={amount} onClick={() => goDetail(r.id)}>
                  {texts}
                  {amount}
                </ListRow>
              </div>
            );
          })}

          {reachedEnd ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Paragraph.Text typography="st13">{ERROR_MESSAGES[416]}</Paragraph.Text>
            </div>
          ) : null}

          {adGroupId ? <AdSlot adGroupId={adGroupId} /> : null}
        </div>
      )}

      <div style={{ height: 96 }} />

      <button
        type="button"
        data-testid="history-fab"
        aria-label="새 기록 추가"
        onClick={openAddSheet}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(var(--toss-safe-area-bottom) + 56px + 16px)',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          border: 'none',
          backgroundColor: 'var(--adaptiveBlue500)',
          color: 'var(--adaptiveBackground)',
          fontSize: 28,
          lineHeight: '56px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.16)',
        }}
      >
        +
      </button>

      <RecordSheet
        open={sheetOpen}
        mode="create"
        initial={sheetInitial}
        onClose={() => setSheetOpen(false)}
        onSaved={() => setSheetOpen(false)}
      />
    </ScreenScaffold>
  );
}
