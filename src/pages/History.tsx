import { useMemo, useState } from "react";
import { Button, Paragraph, Spacing, Toast, Top } from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { ChipGroup } from "../components/ChipGroup";
import { EmptyState, LoadingState } from "../components/StateView";
import { RecordList } from "../components/RecordList";
import { RecordActionSheet } from "../components/RecordActionSheet";
import { AdSlot } from "../components/AdSlot";
import { useStorage } from "../store/StorageProvider";
import { formatKRW } from "../lib/format";
import { HISTORY_PAGE_SIZE } from "../lib/constants";
import type { GiftRecord } from "../lib/types";

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "given", label: "준 기록" },
  { value: "received", label: "받은 기록" },
];

/** 앱인토스 콘솔에서 발급한 배너 광고 그룹 ID (.env의 VITE_TOSS_AD_GROUP_ID) */
const AD_GROUP_ID: string = import.meta.env.VITE_TOSS_AD_GROUP_ID ?? "";

function fireSuccessHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function fireTickHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

export default function History() {
  const navigate = useNavigate();
  const { ready, records, deleteRecord } = useStorage();

  const [filter, setFilter] = useState<string>("all");
  const [visible, setVisible] = useState(HISTORY_PAGE_SIZE);
  const [actionRecord, setActionRecord] = useState<GiftRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.createdAt - a.createdAt);
    return filter === "all" ? sorted : sorted.filter((r) => r.direction === filter);
  }, [records, filter]);

  const total = filtered.reduce((sum, record) => sum + record.amount, 0);

  function handleSelect(record: GiftRecord) {
    fireTickHaptic();
    setActionRecord(record);
  }

  function handleConfirmDelete(record: GiftRecord) {
    const written = deleteRecord(record.id);
    setActionRecord(null);
    if (written.ok) {
      fireSuccessHaptic();
      setToast("삭제했어요");
    } else {
      setToast("삭제하지 못했어요");
    }
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
      <div data-testid="history-count">
        <Paragraph.Text typography="st11">
          {filtered.length}건 · {formatKRW(total)}
        </Paragraph.Text>
      </div>
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
          <RecordList
            records={filtered}
            visibleCount={visible}
            onLoadMore={() => setVisible((prev) => prev + HISTORY_PAGE_SIZE)}
            onSelect={handleSelect}
          />
          <Spacing size={16} />
          <AdSlot adGroupId={AD_GROUP_ID} />
        </>
      )}

      <Spacing size={24} />

      <RecordActionSheet
        record={actionRecord}
        onClose={() => setActionRecord(null)}
        onConfirmDelete={handleConfirmDelete}
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
