import { useState } from "react";
import { Top, Paragraph, Spacing, TextField, Toast } from "@toss/tds-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { SubmitFooter } from "../components/BottomCTA";
import { ChipGroup } from "../components/ChipGroup";
import { useStorage } from "../store/StorageProvider";
import { eventTypeOptions, relationOptions } from "../lib/options";
import type { Direction, EventType, RelationType } from "../lib/types";

const DIRECTION_OPTIONS = [
  { value: "given", label: "내가 줬어요" },
  { value: "received", label: "내가 받았어요" },
];

function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** @AI:NOTE 금액은 1,000원 단위 관례를 따른다 — 단위 미만은 입력 실수일 확률이 높다. */
function amountError(raw: string): string | null {
  const value = Number(raw.replace(/,/g, ""));
  if (!raw.trim() || Number.isNaN(value)) return "금액을 입력해 주세요";
  if (value < 1000 || value > 10000000) return "1,000원부터 10,000,000원까지 적을 수 있어요";
  if (value % 1000 !== 0) return "금액은 1,000원 단위로 적어주세요";
  return null;
}

export default function RecordNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addRecord } = useStorage();

  const prefill = (
    (location.state ?? null) as {
      prefill?: { eventType: EventType; relation: RelationType; amount: number };
    } | null
  )?.prefill;

  const [personName, setPersonName] = useState("");
  const [direction, setDirection] = useState<string>("given");
  const [eventType, setEventType] = useState<string>(prefill?.eventType ?? "");
  const [relation, setRelation] = useState<string>(prefill?.relation ?? "");
  const [amount, setAmount] = useState<string>(prefill ? String(prefill.amount) : "");
  const [date, setDate] = useState<string>(todayISO());
  const [memo, setMemo] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameError =
    personName.trim().length === 0
      ? "이름을 적어주세요"
      : personName.trim().length > 20
        ? "이름을 20자 이내로 적어주세요"
        : null;
  const amountMessage = amountError(amount);
  const dateError = /^\d{4}-\d{2}-\d{2}$/.test(date) ? null : "날짜를 YYYY-MM-DD로 골라주세요";
  const memoError = memo.length > 50 ? "메모는 50자까지 적을 수 있어요" : null;

  const isValid =
    !nameError && !amountMessage && !dateError && !memoError && eventType !== "" && relation !== "";

  function save() {
    if (!isValid || submitting) return;
    setSubmitting(true);

    const written = addRecord(
      personName.trim(),
      eventType as EventType,
      relation as RelationType,
      Number(amount.replace(/,/g, "")),
      date,
      direction as Direction,
      memo.trim(),
    );

    if (written.ok) {
      navigate("/history", { replace: true });
      return;
    }

    setSubmitting(false);
    setToast(
      written.reason === "LIMIT_REACHED"
        ? "기록은 1,000건까지 저장할 수 있어요"
        : "저장 공간이 부족해요",
    );
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>경조사 기록</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter label="기록 저장하기" onClick={save} disabled={!isValid || submitting} />
      }
    >
      <Spacing size={8} />
      <TextField
        variant="box"
        label="누구의 경조사인가요?"
        placeholder="김민서"
        value={personName}
        maxLength={20}
        enterKeyHint="done"
        hasError={personName.length > 0 && nameError != null}
        help={personName.length > 0 ? (nameError ?? undefined) : undefined}
        onChange={(e) => setPersonName(e.target.value)}
      />

      <Spacing size={20} />
      <ChipGroup
        label="주고받은 방향"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={setDirection}
        testId="group-direction"
      />

      <Spacing size={20} />
      <ChipGroup
        label="경조사 유형"
        options={eventTypeOptions}
        value={eventType}
        onChange={setEventType}
        testId="group-eventType"
      />

      <Spacing size={20} />
      <ChipGroup
        label="관계"
        options={relationOptions}
        value={relation}
        onChange={setRelation}
        testId="group-relation"
      />

      <Spacing size={20} />
      <TextField
        variant="box"
        label="금액"
        placeholder="100000"
        suffix="원"
        inputMode="numeric"
        value={amount}
        hasError={amount.length > 0 && amountMessage != null}
        help={amount.length > 0 ? (amountMessage ?? undefined) : undefined}
        onChange={(e) => setAmount(e.target.value)}
      />

      <Spacing size={20} />
      {/* @AI:NOTE type="date"는 TDS 플로팅 라벨 입력과 겹쳐 빈 칸처럼 보인다 → 텍스트 + 형식 검증. */}
      <TextField
        variant="box"
        label="날짜"
        placeholder="2026-09-12"
        inputMode="numeric"
        value={date}
        hasError={dateError != null}
        help={dateError ?? undefined}
        onChange={(e) => setDate(e.target.value)}
      />

      <Spacing size={20} />
      <TextField
        variant="box"
        label="메모 (선택)"
        placeholder="같은 부서 동료"
        value={memo}
        maxLength={50}
        enterKeyHint="done"
        hasError={memoError != null}
        help={memoError ?? undefined}
        onChange={(e) => setMemo(e.target.value)}
      />

      <Spacing size={16} />
      <Paragraph.Text typography="st12">기록은 이 기기에만 저장돼요</Paragraph.Text>
      <Spacing size={120} />

      <Toast
        open={toast != null}
        position="bottom"
        text={toast ?? ""}
        onClose={() => setToast(null)}
      />
    </ScreenScaffold>
  );
}
