import { useState } from "react";
import { Top, Toast } from "@toss/tds-mobile";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { SubmitFooter } from "../components/BottomCTA";
import { RecordForm } from "../components/RecordForm";
import { useStorage } from "../store/StorageProvider";
import {
  validateAmount,
  validateDate,
  validateMemo,
  validatePersonName,
} from "../lib/validation";
import type { Direction, EventType, RelationType } from "../lib/types";

function todayISO(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

function parseAmount(formatted: string): number {
  return Number(formatted.replace(/,/g, "")) || 0;
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
  const [direction, setDirection] = useState<Direction>("given");
  const [eventType, setEventType] = useState<EventType | "">(prefill?.eventType ?? "");
  const [relation, setRelation] = useState<RelationType | "">(prefill?.relation ?? "");
  const [amount, setAmount] = useState<string>(
    prefill ? formatAmountInput(String(prefill.amount)) : "",
  );
  const [date, setDate] = useState<string>(todayISO());
  const [memo, setMemo] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const errors = {
    personName: validatePersonName(personName),
    amount: validateAmount(parseAmount(amount)),
    date: validateDate(date),
    memo: validateMemo(memo),
  };

  const isValid =
    !errors.personName &&
    !errors.amount &&
    !errors.date &&
    !errors.memo &&
    eventType !== "" &&
    relation !== "";

  function save() {
    if (!isValid || submitting) return;
    setSubmitting(true);

    const written = addRecord(
      personName.trim(),
      eventType as EventType,
      relation as RelationType,
      parseAmount(amount),
      date,
      direction,
      memo.trim(),
    );

    if (written.ok) {
      setToast("기록했어요");
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
      <RecordForm
        personName={personName}
        onPersonNameChange={setPersonName}
        direction={direction}
        onDirectionChange={setDirection}
        eventType={eventType}
        onEventTypeChange={setEventType}
        relation={relation}
        onRelationChange={setRelation}
        amount={amount}
        onAmountChange={(value) => setAmount(formatAmountInput(value))}
        date={date}
        onDateChange={setDate}
        memo={memo}
        onMemoChange={setMemo}
        errors={errors}
      />

      <Toast
        open={toast != null}
        position="bottom"
        text={toast ?? ""}
        onClose={() => setToast(null)}
      />
    </ScreenScaffold>
  );
}
