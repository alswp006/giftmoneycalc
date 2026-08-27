import { useState } from "react";
import { BottomSheet, Paragraph, TextField, Spacing, Button, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { useRecords } from "@/state/useRecords";
import type { HistoryRecord } from "@/lib/types";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10_000_000;
const AMOUNT_ERROR = "1원부터 1,000만 원까지 입력할 수 있어요";
const MAX_LABEL_LENGTH = 20;
const MAX_MEMO_LENGTH = 100;

type SaveRecordSheetInput = Omit<
  HistoryRecord,
  "id" | "createdAt" | "updatedAt" | "amount" | "counterpartLabel" | "memo"
>;

type SaveRecordSheetProps = {
  open: boolean;
  record: SaveRecordSheetInput;
  onClose: () => void;
  onSaved: (recordId: string) => void;
};

function fireSaveHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function errorToastText(code: string): string {
  if (code === "QUOTA_EXCEEDED") return "저장 공간이 부족해요";
  if (code === "RECORD_LIMIT_EXCEEDED") return "기록은 500개까지 저장할 수 있어요. 오래된 기록을 지워주세요";
  return "저장하지 못했어요. 다시 시도해 주세요";
}

export default function SaveRecordSheet({ open, record, onClose, onSaved }: SaveRecordSheetProps) {
  const { add } = useRecords();
  const [amount, setAmount] = useState("");
  const [counterpartLabel, setCounterpartLabel] = useState("");
  const [memo, setMemo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, text: "" });

  const parsedAmount = amount.trim() === "" ? NaN : Number(amount);
  const isAmountValid = Number.isInteger(parsedAmount) && parsedAmount >= MIN_AMOUNT && parsedAmount <= MAX_AMOUNT;

  const handleSave = async () => {
    if (!isAmountValid || isSaving) return;
    fireSaveHaptic();
    setIsSaving(true);

    const result = await add({
      ...record,
      amount: parsedAmount,
      ...(counterpartLabel.trim() ? { counterpartLabel } : {}),
      ...(memo.trim() ? { memo } : {}),
    });

    setIsSaving(false);

    if (!result.ok) {
      setToast({ open: true, text: errorToastText(result.code) });
      return;
    }

    setToast({ open: true, text: "기록했어요" });
    onSaved(result.value.id);
    onClose();
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <Paragraph.Text typography="t4">실제로 낸 금액을 남겨요</Paragraph.Text>
        <Spacing size={16} />
        <TextField
          variant="box"
          label="낸 금액"
          placeholder="예: 50,000"
          inputMode="numeric"
          value={amount}
          hasError={!isAmountValid}
          help={!isAmountValid ? AMOUNT_ERROR : undefined}
          data-testid="amount-input"
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        />
        <Spacing size={12} />
        <TextField
          variant="box"
          label="상대 표기 (선택)"
          placeholder="예: 민지"
          help="최대 20자"
          value={counterpartLabel}
          data-testid="counterpart-input"
          onChange={(e) => setCounterpartLabel(e.target.value.slice(0, MAX_LABEL_LENGTH))}
        />
        <Spacing size={12} />
        <TextField
          variant="box"
          label="메모 (선택)"
          placeholder="예: 청첩장 직접 전달"
          help="최대 100자"
          value={memo}
          data-testid="memo-input"
          onChange={(e) => setMemo(e.target.value.slice(0, MAX_MEMO_LENGTH))}
        />
        <Spacing size={24} />
        <Button
          variant="fill"
          display="block"
          size="large"
          disabled={!isAmountValid || isSaving}
          data-testid="save-button"
          onClick={handleSave}
        >
          기록하기
        </Button>
        <Spacing size={8} />
      </BottomSheet>
      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
