import { useState } from "react";
import {
  AlertDialog,
  BottomSheet,
  Button,
  Chip,
  Paragraph,
  Spacing,
  TextField,
  Toast,
} from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { createRecord, updateRecord } from "@/lib/records";
import { ERROR_MESSAGES } from "@/lib/errors";
import type { AppErrorCode, EventType, GiftRecord, Relationship } from "@/lib/types";

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "wedding", label: "결혼식" },
  { value: "funeral", label: "장례식" },
  { value: "firstBirthday", label: "돌잔치" },
  { value: "etc", label: "기타" },
];

const RELATIONSHIP_OPTIONS: Array<{ value: Relationship; label: string }> = [
  { value: "parents", label: "부모님" },
  { value: "siblings", label: "형제자매" },
  { value: "spouse", label: "배우자" },
  { value: "children", label: "자녀" },
  { value: "relatives", label: "친척" },
  { value: "friends", label: "친구" },
  { value: "colleagues", label: "동료" },
  { value: "boss", label: "상사" },
  { value: "acquaintance", label: "지인" },
];

const DEFAULT_EVENT_TYPE: EventType = "wedding";
const DEFAULT_RELATIONSHIP: Relationship = "friends";
const SAVE_BUTTON_MIN_HEIGHT = "52px";

function formatDateValue(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return digits;
}

function hapticTap(type: "success" | "tickWeak") {
  try {
    generateHapticFeedback({ type });
  } catch {
    // 햅틱 미지원 — 무시
  }
}

export type RecordSheetInitial = Partial<GiftRecord> & { recommendedAmount?: number };

export interface RecordSheetProps {
  open: boolean;
  mode: "create" | "edit";
  initial?: RecordSheetInitial;
  onClose: () => void;
  onSaved: (record: GiftRecord) => void;
}

/**
 * 기록 추가·수정 BottomSheet.
 * create 모드의 409는 중복 확인 다이얼로그(force 재시도), edit 모드의 409는
 * 동시수정 충돌이라 Toast 후 즉시 닫는다 — 같은 코드도 모드에 따라 처리 경로가 다르다.
 */
export function RecordSheet({ open, mode, initial, onClose, onSaved }: RecordSheetProps) {
  const [personName, setPersonName] = useState(initial?.personName ?? "");
  const [amount, setAmount] = useState(() => {
    if (initial?.amount != null) return String(initial.amount);
    if (initial?.recommendedAmount != null) return String(initial.recommendedAmount);
    return "";
  });
  const [eventDate, setEventDate] = useState(() =>
    initial?.eventDate ? formatDateValue(initial.eventDate) : "",
  );
  const [eventType, setEventType] = useState<EventType>(initial?.eventType ?? DEFAULT_EVENT_TYPE);
  const [relationship, setRelationship] = useState<Relationship>(
    initial?.relationship ?? DEFAULT_RELATIONSHIP,
  );
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!open) return null;

  const isValid =
    personName.trim().length > 0 &&
    amount.length > 0 &&
    Number(amount) > 0 &&
    eventDate.length === 10;

  function buildPatch() {
    return {
      personName: personName.trim(),
      eventType,
      relationship,
      eventDate,
      amount: Number(amount),
      memo: memo.trim() ? memo.trim() : undefined,
    };
  }

  function attemptSave(force: boolean) {
    setSaving(true);
    setToastMessage(null);
    hapticTap("success");

    const result =
      mode === "create"
        ? createRecord(buildPatch(), force ? { force: true } : undefined)
        : updateRecord(initial!.id!, buildPatch(), initial!.updatedAt!);

    setSaving(false);

    if (result.ok) {
      setShowConflict(false);
      onSaved(result.data);
      onClose();
      return;
    }

    const code = result.error.code as AppErrorCode;
    if (code === 409) {
      if (mode === "create") {
        setShowConflict(true);
      } else {
        setToastMessage(ERROR_MESSAGES[409]);
        onClose();
      }
      return;
    }

    setToastMessage(ERROR_MESSAGES[code]);
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={mode === "create" ? "기록 추가하기" : "기록 수정하기"}
      hasTextField
    >
      <div>
        <TextField
          variant="box"
          label="누구에게"
          placeholder="이름을 입력해 주세요"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
        />
        <Spacing size={12} />
        <TextField
          variant="box"
          label="금액"
          placeholder="50000"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        />
        <Spacing size={12} />
        <TextField
          variant="box"
          label="날짜"
          placeholder="20260815"
          inputMode="numeric"
          value={eventDate}
          onChange={(e) => setEventDate(formatDateValue(e.target.value))}
        />
        <Spacing size={16} />
        <Paragraph.Text typography="st13">행사</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              onClick={() => {
                hapticTap("tickWeak");
                setEventType(opt.value);
              }}
            >
              {eventType === opt.value ? `✓ ${opt.label}` : opt.label}
            </Chip>
          ))}
        </div>
        <Spacing size={12} />
        <Paragraph.Text typography="st13">관계</Paragraph.Text>
        <Spacing size={8} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              onClick={() => {
                hapticTap("tickWeak");
                setRelationship(opt.value);
              }}
            >
              {relationship === opt.value ? `✓ ${opt.label}` : opt.label}
            </Chip>
          ))}
        </div>
        <Spacing size={12} />
        <TextField
          variant="box"
          label="메모"
          placeholder="선택 입력"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        <Spacing size={16} />
        <Button
          variant="fill"
          display="block"
          disabled={!isValid || saving}
          onClick={() => attemptSave(false)}
          style={{ minHeight: SAVE_BUTTON_MIN_HEIGHT }}
        >
          {saving ? "저장 중" : "저장"}
        </Button>
      </div>

      <AlertDialog
        open={showConflict}
        title="같은 날짜에 같은 이름의 기록이 이미 있어요"
        description="그래도 새 기록으로 저장할까요?"
        alertButton={
          <AlertDialog.AlertButton onClick={() => attemptSave(true)}>
            새 기록으로 저장
          </AlertDialog.AlertButton>
        }
        onClose={() => setShowConflict(false)}
      />

      <Toast open={toastMessage !== null} position="bottom" text={toastMessage ?? ""} />
    </BottomSheet>
  );
}
