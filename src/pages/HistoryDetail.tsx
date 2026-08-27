import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Top, ListRow, Border, Paragraph, Spacing, AlertDialog, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { ButtonStack } from "@/components/BottomCTA";
import { Card } from "@/components/Card";
import { Amount } from "@/components/Amount";
import { formatNumber } from "@/lib/utils";
import { useRecords } from "@/state/useRecords";
import type { CalculationInput, EventType, Relation } from "@/lib/types";

const FALLBACK_LABEL = "기타";

const EVENT_TYPE_LABEL: Record<string, string> = {
  WEDDING: "결혼식",
  FUNERAL: "장례식",
  FIRST_BIRTHDAY: "돌잔치",
  OPENING: "개업식",
};

const RELATION_LABEL: Record<string, string> = {
  FAMILY: "가족",
  RELATIVE: "친척",
  CLOSE_FRIEND: "친한 친구",
  FRIEND: "친구",
  COWORKER: "동료",
  ACQUAINTANCE: "지인",
};

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { records, remove } = useRecords();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, text: "" });

  const record = records.find((r) => r.id === id);

  useEffect(() => {
    if (!record) {
      navigate("/history", { replace: true });
    }
  }, [record, navigate]);

  if (!record) {
    return null;
  }

  const eventTypeLabel = EVENT_TYPE_LABEL[record.eventType] ?? FALLBACK_LABEL;
  const relationLabel = RELATION_LABEL[record.relation] ?? FALLBACK_LABEL;

  async function handleConfirmDelete() {
    setConfirmOpen(false);
    const result = await remove(record!.id);
    if (!result.ok) {
      setToast({ open: true, text: "기록을 지우지 못했어요" });
      return;
    }
    setToast({ open: true, text: "기록을 지웠어요" });
    navigate("/history");
  }

  function handleRecalculate() {
    const prefill: Partial<CalculationInput> = {
      eventType: record!.eventType as EventType,
      relation: record!.relation as Relation,
      attended: record!.attended,
      companions: record!.companions,
      eventDate: record!.eventDate,
    };
    navigate("/", { state: { prefill } });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>기록 상세</Top.TitleParagraph>} />}
      bottom={
        <ButtonStack
          primary={{ label: "다시 계산하기", onClick: handleRecalculate }}
          secondary={{ label: "삭제", onClick: () => setConfirmOpen(true) }}
        />
      }
    >
      <Card testId="history-detail-card">
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="낸 금액"
              bottom={`추천 ${formatNumber(record.recommendedAmount)}원`}
            />
          }
          right={<Amount value={record.amount} unit="원" typography="t4" />}
        />
        <Border />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top={`${eventTypeLabel} · ${relationLabel}`}
              bottom={`${record.eventDate} · ${record.attended ? "참석" : "불참"} · 동반 ${record.companions}명`}
            />
          }
        />
        <Border />
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="메모" bottom={record.memo || "없어요"} />}
        />
      </Card>

      <Spacing size={24} />

      <AlertDialog
        open={confirmOpen}
        title="기록을 지울까요?"
        description={<Paragraph.Text typography="t6">지운 기록은 되돌릴 수 없어요</Paragraph.Text>}
        onClose={() => setConfirmOpen(false)}
        alertButton={<AlertDialog.AlertButton onClick={handleConfirmDelete}>삭제하기</AlertDialog.AlertButton>}
      />
      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </ScreenScaffold>
  );
}
