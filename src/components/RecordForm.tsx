import { Paragraph, Spacing, TextField } from "@toss/tds-mobile";
import { ChipGroup } from "./ChipGroup";
import { eventTypeOptions, relationOptions } from "../lib/options";
import type { Direction, EventType, RelationType } from "../lib/types";

const DIRECTION_OPTIONS = [
  { value: "given", label: "내가 줬어요" },
  { value: "received", label: "내가 받았어요" },
];

export interface RecordFormErrors {
  personName: string | null;
  amount: string | null;
  date: string | null;
  memo: string | null;
}

export interface RecordFormProps {
  personName: string;
  onPersonNameChange: (value: string) => void;
  direction: Direction;
  onDirectionChange: (value: Direction) => void;
  eventType: EventType | "";
  onEventTypeChange: (value: EventType) => void;
  relation: RelationType | "";
  onRelationChange: (value: RelationType) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  memo: string;
  onMemoChange: (value: string) => void;
  errors: RecordFormErrors;
}

/**
 * 경조사 기록 입력 폼 본문 — 상태는 부모(RecordNew)가 소유하고 이 컴포넌트는 순수 표현.
 */
export function RecordForm({
  personName,
  onPersonNameChange,
  direction,
  onDirectionChange,
  eventType,
  onEventTypeChange,
  relation,
  onRelationChange,
  amount,
  onAmountChange,
  date,
  onDateChange,
  memo,
  onMemoChange,
  errors,
}: RecordFormProps) {
  return (
    <>
      <Spacing size={8} />
      <TextField
        variant="box"
        label="누구의 경조사인가요?"
        placeholder="김민서"
        value={personName}
        maxLength={20}
        enterKeyHint="done"
        hasError={personName.length > 0 && errors.personName != null}
        help={personName.length > 0 ? (errors.personName ?? undefined) : undefined}
        onChange={(e) => onPersonNameChange(e.target.value)}
        data-testid="field-personName"
      />

      <Spacing size={20} />
      <ChipGroup
        label="주고받은 방향"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={(value) => onDirectionChange(value as Direction)}
        testId="group-direction"
      />

      <Spacing size={20} />
      <ChipGroup
        label="경조사 유형"
        options={eventTypeOptions}
        value={eventType}
        onChange={(value) => onEventTypeChange(value as EventType)}
        testId="group-eventType"
      />

      <Spacing size={20} />
      <ChipGroup
        label="관계"
        options={relationOptions}
        value={relation}
        onChange={(value) => onRelationChange(value as RelationType)}
        testId="group-relation"
      />

      <Spacing size={20} />
      <TextField
        variant="box"
        label="금액"
        placeholder="100,000"
        suffix="원"
        inputMode="numeric"
        enterKeyHint="done"
        value={amount}
        hasError={amount.length > 0 && errors.amount != null}
        help={amount.length > 0 ? (errors.amount ?? undefined) : undefined}
        onChange={(e) => onAmountChange(e.target.value)}
        data-testid="field-amount"
      />

      <Spacing size={20} />
      {/* @AI:NOTE type="date"는 TDS 플로팅 라벨 입력과 겹쳐 빈 칸처럼 보인다 → 텍스트 + 형식 검증. */}
      <TextField
        variant="box"
        label="날짜"
        placeholder="2026-09-12"
        inputMode="numeric"
        enterKeyHint="done"
        value={date}
        hasError={errors.date != null}
        help={errors.date ?? undefined}
        onChange={(e) => onDateChange(e.target.value)}
        data-testid="field-date"
      />

      <Spacing size={20} />
      <TextField
        variant="box"
        label="메모 (선택)"
        placeholder="같은 부서 동료"
        value={memo}
        maxLength={50}
        enterKeyHint="done"
        hasError={errors.memo != null}
        help={errors.memo ?? undefined}
        onChange={(e) => onMemoChange(e.target.value)}
        data-testid="field-memo"
      />

      <Spacing size={16} />
      <Paragraph.Text typography="st12">기록은 이 기기에만 저장돼요</Paragraph.Text>
      <Spacing size={120} />
    </>
  );
}
