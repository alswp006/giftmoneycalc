import { Chip, ChipItem, Paragraph, Spacing, Switch, TextField } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import type { CalculationInput, EventType, Relation } from '@/lib/types';

/**
 * 축의금 계산 입력 폼 — 순수 프레젠테이션 컴포넌트.
 *
 * 값과 onChange만 받는다. 라우팅·저장소는 호출하지 않고, 하단 고정 CTA도 렌더하지 않는다
 * (조립 화면의 책임). 상태는 전부 상위가 소유하므로 화면 이동 후에도 입력이 유지된다.
 */

const MAX_COMPANIONS = 9;

// @AI:NOTE 라벨-코드 매핑은 도메인 열거형(EVENT_TYPES/RELATIONS)과 1:1이며 순서가 화면 노출 순서다.
const EVENT_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: 'WEDDING', label: '결혼식' },
  { value: 'FUNERAL', label: '장례식' },
  { value: 'FIRST_BIRTHDAY', label: '돌잔치' },
  { value: 'OPENING', label: '개업' },
];

const RELATION_OPTIONS: Array<{ value: Relation; label: string }> = [
  { value: 'FAMILY', label: '가족' },
  { value: 'RELATIVE', label: '친척' },
  { value: 'CLOSE_FRIEND', label: '절친' },
  { value: 'FRIEND', label: '친구' },
  { value: 'COWORKER', label: '직장동료' },
  { value: 'ACQUAINTANCE', label: '지인' },
];

/** 터치 타겟 44px 보장 — TDS 기본 높이보다 작아지지 않게만 관여한다(색/여백은 TDS 그대로). */
const HIT_AREA = { minHeight: 44 } as const;

/** WebView 밖(브라우저·jsdom)에서는 SDK가 throw한다 — 햅틱 실패로 화면이 죽지 않게 삼킨다. */
function tickWeak() {
  try {
    generateHapticFeedback({ type: 'tickWeak' });
  } catch {
    // 네이티브 브릿지 없음 — 무시
  }
}

/** 숫자만 남긴다. 남은 게 없으면 null(= 직전 값 유지). */
function toDigits(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length === 0 ? null : digits;
}

/** 입력 중에도 YYYY-MM-DD 모양을 유지한다. */
function formatDateInput(raw: string): string {
  const d = raw.replace(/[^0-9]/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export type CalculateFormProps = {
  value: Partial<CalculationInput>;
  onChange: (next: Partial<CalculationInput>) => void;
};

export function CalculateForm({ value, onChange }: CalculateFormProps) {
  const attended = value.attended === true;

  const selectEventType = (eventType: EventType) => {
    tickWeak();
    onChange({ ...value, eventType });
  };

  const selectRelation = (relation: Relation) => {
    tickWeak();
    onChange({ ...value, relation });
  };

  const toggleAttended = () => {
    tickWeak();
    onChange({ ...value, attended: !attended });
  };

  const changeCompanions = (raw: string) => {
    const digits = toDigits(raw);
    if (digits === null) return;
    onChange({ ...value, companions: Math.min(MAX_COMPANIONS, Number(digits)) });
  };

  return (
    <div>
      <Paragraph.Text typography="t4">어떤 자리인가요?</Paragraph.Text>
      <Spacing size={12} />
      <Chip wrap>
        {EVENT_OPTIONS.map((option) => (
          <ChipItem
            key={option.value}
            selected={value.eventType === option.value}
            onClick={() => selectEventType(option.value)}
            style={HIT_AREA}
          >
            {option.label}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">상대와 어떤 사이인가요?</Paragraph.Text>
      <Spacing size={12} />
      <Chip wrap>
        {RELATION_OPTIONS.map((option) => (
          <ChipItem
            key={option.value}
            selected={value.relation === option.value}
            onClick={() => selectRelation(option.value)}
            style={HIT_AREA}
          >
            {option.label}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={24} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          ...HIT_AREA,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <Paragraph.Text typography="t5">행사에 참석해요</Paragraph.Text>
          <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
            식대가 추천 금액에 더해져요
          </Paragraph.Text>
        </div>
        <Switch checked={attended} onChange={toggleAttended} aria-label="행사 참석 여부" />
      </div>

      {attended && (
        <>
          <Spacing size={16} />
          <TextField
            variant="box"
            label="동반 인원 (본인 제외)"
            placeholder="0"
            inputMode="numeric"
            help="최대 9명"
            data-testid="companions-input"
            value={value.companions === undefined ? '' : String(value.companions)}
            onChange={(e) => changeCompanions(e.target.value)}
          />
        </>
      )}

      <Spacing size={16} />

      <TextField
        variant="box"
        label="행사 날짜"
        placeholder="2026-09-12"
        inputMode="numeric"
        data-testid="event-date-input"
        value={value.eventDate ?? ''}
        onChange={(e) => onChange({ ...value, eventDate: formatDateInput(e.target.value) })}
      />
    </div>
  );
}

export default CalculateForm;
