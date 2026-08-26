import { useMemo, useState } from "react";
import {
  Top,
  Paragraph,
  Spacing,
  ListRow,
  Button,
  AlertDialog,
  Toast,
} from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { ChipGroup } from "../components/ChipGroup";
import { EmptyState, LoadingState } from "../components/StateView";
import { useStorage } from "../store/StorageProvider";
import { formatKRW } from "../lib/format";
import { EVENT_LABEL, HISTORY_PAGE_SIZE } from "../lib/constants";
import type { GiftRecord } from "../lib/types";

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "given", label: "준 기록" },
  { value: "received", label: "받은 기록" },
];

export default function History() {
  const navigate = useNavigate();
  const { ready, records, deleteRecord } = useStorage();

  const [filter, setFilter] = useState<string>("all");
  const [visible, setVisible] = useState(HISTORY_PAGE_SIZE);
  const [pendingDelete, setPendingDelete] = useState<GiftRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt);
    return filter === "all" ? sorted : sorted.filter((r) => r.direction === filter);
  }, [records, filter]);

  const total = filtered.reduce((sum, record) => sum + record.amount, 0);
  const shown = filtered.slice(0, visible);

  function confirmDelete() {
    if (!pendingDelete) return;
    const written = deleteRecord(pendingDelete.id);
    setPendingDelete(null);
    setToast(written.ok ? "삭제했어요" : "삭제하지 못했어요");
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>경조사 기록</Top.TitleParagraph>} />}>
      <ChipGroup
        options={FILTERS}
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setVisible(HISTORY_PAGE_SIZE);
        }}
        testId="group-filter"
      />
      <Spacing size={12} />
      <Paragraph.Text typography="st11">
        {filtered.length}건 · {formatKRW(total)}
      </Paragraph.Text>
      <Spacing size={8} />

      {!ready ? (
        <LoadingState rows={5} testId="history-loading" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="아직 기록이 없어요"
          description="경조사 금액을 남겨두면 다음에 참고할 수 있어요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/record/new")}>
              기록 추가하기
            </Button>
          }
          testId="history-empty"
        />
      ) : (
        <>
          {shown.map((record) => (
            <ListRow
              key={record.id}
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={record.personName}
                  bottom={`${EVENT_LABEL[record.eventType]} · ${record.date}`}
                />
              }
              right={
                <Paragraph.Text typography="t6">
                  {record.direction === "given" ? "-" : "+"}
                  {formatKRW(record.amount)}
                </Paragraph.Text>
              }
              onClick={() => setPendingDelete(record)}
            />
          ))}
          {filtered.length > shown.length && (
            <>
              <Spacing size={12} />
              <Button
                variant="weak"
                display="block"
                onClick={() => setVisible((prev) => prev + HISTORY_PAGE_SIZE)}
              >
                {filtered.length - shown.length}건 더 보기
              </Button>
            </>
          )}
        </>
      )}

      <Spacing size={24} />

      <AlertDialog
        open={pendingDelete != null}
        title="기록을 삭제할까요?"
        description={
          pendingDelete ? `${pendingDelete.personName} · ${formatKRW(pendingDelete.amount)}` : ""
        }
        alertButton={
          <AlertDialog.AlertButton onClick={confirmDelete}>삭제</AlertDialog.AlertButton>
        }
        onClose={() => setPendingDelete(null)}
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
