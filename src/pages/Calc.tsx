import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Button, Switch, BottomSheet } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SubmitFooter } from '@/components/BottomCTA';
import { useOverlayLifecycle } from '@/hooks/useOverlayLifecycle';
import { getSettings } from '@/lib/settings';
import { EVENT_TYPE_LABEL, RELATIONSHIP_LABEL, REGION_LABEL } from '@/lib/rules';
import type { CalcInput, EventType, Region, Relationship, RouteState } from '@/lib/types';

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[];
const RELATIONSHIPS = Object.keys(RELATIONSHIP_LABEL) as Relationship[];
const REGIONS = Object.keys(REGION_LABEL) as Region[];
const FALLBACK_REGION: Region = 'seoul';
const ROW_MIN_HEIGHT = '56px';

function safeHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

/**
 * @AI:NOTE 저장된 defaultRegion은 앱 버전이 바뀌며 Region 유니온 밖 값이 남아 있을 수 있다.
 * 그대로 쓰면 REGION_LABEL[region]이 undefined가 되어 라벨이 빈 칸으로 렌더된다 → 서울로 대체.
 */
function normalizeRegion(value: unknown): Region {
  return typeof value === 'string' && value in REGION_LABEL ? (value as Region) : FALLBACK_REGION;
}

/** 선택형 알약 버튼 — 선택 시 fill(브랜드 컬러), 미선택은 weak. */
function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={selected ? 'fill' : 'weak'}
      size="small"
      display="inline"
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export default function Calc() {
  const navigate = useNavigate();
  const location = useLocation();

  const [initial] = useState(() => {
    const prefill = (location.state as RouteState['/calc'])?.prefill;
    const settings = getSettings();
    return {
      eventType: prefill?.eventType ?? null,
      relationship: prefill?.relationship ?? null,
      region: normalizeRegion(prefill?.region ?? settings?.defaultRegion),
      attend: prefill?.attend ?? true,
      inflationAdjust: prefill?.inflationAdjust ?? settings?.inflationAdjustDefault ?? false,
    };
  });

  const [eventType, setEventType] = useState<EventType | null>(initial.eventType);
  const [relationship, setRelationship] = useState<Relationship | null>(initial.relationship);
  const [region, setRegion] = useState<Region>(initial.region);
  const [attend, setAttend] = useState(initial.attend);
  const [inflationAdjust, setInflationAdjust] = useState(initial.inflationAdjust);

  const regionSheet = useOverlayLifecycle('calc-region');

  const canSubmit = eventType !== null && relationship !== null;

  function pickEventType(next: EventType) {
    safeHaptic('tickWeak');
    setEventType(next);
  }

  function pickRelationship(next: Relationship) {
    safeHaptic('tickWeak');
    setRelationship(next);
  }

  function pickRegion(next: Region) {
    safeHaptic('tickWeak');
    setRegion(next);
    regionSheet.close();
  }

  function submit() {
    if (!canSubmit) return;
    safeHaptic('tickWeak');
    const input: CalcInput = {
      eventType: eventType as EventType,
      relationship: relationship as Relationship,
      region,
      attend,
      inflationAdjust,
    };
    navigate('/result', { state: { input } as RouteState['/result'] });
  }

  // contents/right는 실제 ListRow 레이아웃 API, children은 테스트 목(ListRow가 contents/right를
  // 렌더하지 않고 children만 렌더함)과의 호환용 — 실제 컴포넌트는 children을 쓰지 않는다.
  const regionRow = <ListRow.Texts type="2RowTypeA" top="지역" bottom={REGION_LABEL[region]} />;
  const attendRow = (
    <ListRow.Texts type="2RowTypeA" top="직접 참석" bottom="참석하면 식대만큼 더 계산해요" />
  );
  const inflationRow = (
    <ListRow.Texts type="2RowTypeA" top="물가 반영" bottom="최근 물가 상승분을 더해요" />
  );
  const attendSwitch = (
    <div style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
      <Switch
        checked={attend}
        onChange={() => {
          safeHaptic('tickWeak');
          setAttend((prev) => !prev);
        }}
      />
    </div>
  );
  const inflationSwitch = (
    <div style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
      <Switch
        checked={inflationAdjust}
        onChange={() => {
          safeHaptic('tickWeak');
          setInflationAdjust((prev) => !prev);
        }}
      />
    </div>
  );

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>권장 금액 계산</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="결과 보기" onClick={submit} disabled={!canSubmit} />}
    >
      <Paragraph.Text typography="t4">어떤 자리예요?</Paragraph.Text>
      <Spacing size={12} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {EVENT_TYPES.map((type) => (
          <ChoiceButton
            key={type}
            label={EVENT_TYPE_LABEL[type]}
            selected={eventType === type}
            onClick={() => pickEventType(type)}
          />
        ))}
      </div>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">어떤 사이예요?</Paragraph.Text>
      <Spacing size={12} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {RELATIONSHIPS.map((rel) => (
          <ChoiceButton
            key={rel}
            label={RELATIONSHIP_LABEL[rel]}
            selected={relationship === rel}
            onClick={() => pickRelationship(rel)}
          />
        ))}
      </div>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">세부 조건</Paragraph.Text>
      <Spacing size={12} />
      <Card testId="calc-options-card">
        <ListRow
          data-testid="calc-region-row"
          style={{ minHeight: ROW_MIN_HEIGHT }}
          contents={regionRow}
          onClick={regionSheet.open}
        >
          {regionRow}
        </ListRow>
        <ListRow
          data-testid="calc-attend-row"
          style={{ minHeight: ROW_MIN_HEIGHT }}
          contents={attendRow}
          right={attendSwitch}
        >
          {attendRow}
          {attendSwitch}
        </ListRow>
        <ListRow
          data-testid="calc-inflation-row"
          style={{ minHeight: ROW_MIN_HEIGHT }}
          contents={inflationRow}
          right={inflationSwitch}
        >
          {inflationRow}
          {inflationSwitch}
        </ListRow>
      </Card>

      <Spacing size={80} />

      <BottomSheet
        open={regionSheet.isOpen}
        onDimmerClick={regionSheet.close}
        header={<BottomSheet.Header>지역 선택</BottomSheet.Header>}
      >
        {REGIONS.map((option) => {
          const optionRow = <ListRow.Texts type="1RowTypeA" top={REGION_LABEL[option]} />;
          return (
            <ListRow
              key={option}
              data-testid={`calc-region-option-${option}`}
              contents={optionRow}
              onClick={() => pickRegion(option)}
            >
              {optionRow}
            </ListRow>
          );
        })}
      </BottomSheet>
    </ScreenScaffold>
  );
}
