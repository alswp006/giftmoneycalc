import { useEffect, useState } from "react";
import { AlertDialog, BottomSheet, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { formatKRW } from "../lib/format";
import type { GiftRecord } from "../lib/types";

function fireTickHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

/**
 * 기록 행 탭 시 뜨는 액션 시트 — '삭제하기' 선택 시 확인 다이얼로그를 한 번 더 거친다.
 *
 * Pre-built 조합: BottomSheet(1차 선택) → AlertDialog(2차 확인). 실제 삭제·토스트·성공
 * 햅틱은 호출부(History)가 onConfirmDelete에서 처리한다 — 이 컴포넌트는 흐름만 관리.
 */
export function RecordActionSheet({
  record,
  onClose,
  onConfirmDelete,
}: {
  record: GiftRecord | null;
  onClose: () => void;
  onConfirmDelete: (record: GiftRecord) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!record) setConfirming(false);
  }, [record]);

  return (
    <>
      <BottomSheet
        open={record != null && !confirming}
        onDimmerClick={onClose}
        header={<BottomSheet.Header>이 기록을 어떻게 할까요?</BottomSheet.Header>}
      >
        <Button
          variant="weak"
          display="block"
          onClick={() => {
            fireTickHaptic();
            setConfirming(true);
          }}
        >
          삭제하기
        </Button>
      </BottomSheet>

      <AlertDialog
        open={record != null && confirming}
        title="기록을 삭제할까요?"
        description={record ? `${record.personName} · ${formatKRW(record.amount)}` : ""}
        alertButton={
          <AlertDialog.AlertButton
            onClick={() => {
              if (record) onConfirmDelete(record);
            }}
          >
            삭제
          </AlertDialog.AlertButton>
        }
        onClose={onClose}
      />
    </>
  );
}
