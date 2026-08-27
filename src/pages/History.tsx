import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chip, ListRow, Paragraph, Spacing, Button, Asset } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { EmptyState } from "@/components/StateView";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useRecords } from "@/state/useRecords";
import { formatNumber } from "@/lib/utils";
import type { EventType, HistoryRecord } from "@/lib/types";

const EVENT_TYPE_LABEL: Record<string, string> = {
  WEDDING: "결혼식",
  FUNERAL: "장례식",
  FIRST_BIRTHDAY: "돌잔치",
  OPENING: "개업",
};

const RELATION_LABEL: Record<string, string> = {
  FAMILY: "가족",
  RELATIVE: "친척",
  CLOSE_FRIEND: "친한 친구",
  FRIEND: "친구",
  COWORKER: "동료",
  ACQUAINTANCE: "지인",
};

const FILTERS: Array<{ value: EventType | null; label: string }> = [
  { value: null, label: "전체" },
  { value: "WEDDING", label: "결혼식" },
  { value: "FUNERAL", label: "장례식" },
  { value: "FIRST_BIRTHDAY", label: "돌잔치" },
  { value: "OPENING", label: "개업" },
];

const INITIAL_WINDOW = 30;
const WINDOW_STEP = 30;

function labelOf(map: Record<string, string>, value: string): string {
  return map[value] ?? "기타";
}

export default function History() {
  const navigate = useNavigate();
  const { records } = useRecords();
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_WINDOW);

  const filtered = useMemo(() => {
    const base = selectedType ? records.filter((r) => r.eventType === selectedType) : records;
    return [...base].sort((a, b) => {
      const byDate = b.eventDate.localeCompare(a.eventDate);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [records, selectedType]);

  useEffect(() => {
    setVisibleCount(INITIAL_WINDOW);
  }, [selectedType]);

  useEffect(() => {
    function onScroll() {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
      if (nearBottom) {
        setVisibleCount((prev) => Math.min(prev + WINDOW_STEP, filtered.length));
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [filtered.length]);

  function handleSelectFilter(value: EventType | null) {
    try {
      Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
    } catch {
      /* WebView 밖에서는 throw — 무시 */
    }
    setSelectedType(value);
  }

  function handleRowClick(record: HistoryRecord) {
    navigate(`/history/${record.id}`, { state: { from: "list" } });
  }

  const visible = filtered.slice(0, Math.min(visibleCount, 50));

  return (
    <ScreenScaffold
      bottom={
        <FloatingTabBar
          items={[
            { label: "홈", path: "/" },
            { label: "기록", path: "/history" },
            { label: "통계", path: "/stats" },
          ]}
        />
      }
    >
      <Paragraph.Text typography="t2">기록</Paragraph.Text>
      <Spacing size={16} />

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <Chip
            key={f.label}
            variant={selectedType === f.value ? "fill" : "weak"}
            onClick={() => handleSelectFilter(f.value)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <Spacing size={16} />

      {records.length === 0 ? (
        <EmptyState
          icon={
            <Asset.ContentIcon
              name="iconReceiptRegular"
              alt="기록 없음"
              style={{ width: 48, height: 48 }}
            />
          }
          title="아직 기록이 없어요"
          description="첫 계산을 하면 여기에 기록이 쌓여요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/")}>
              계산하러 가기
            </Button>
          }
          testId="history-empty"
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="해당 유형 기록이 없어요" description="다른 유형을 선택해 보세요" testId="history-filtered-empty" />
      ) : (
        <div>
          {visible.map((record) => (
            <div
              key={record.id}
              data-testid="history-row"
              role="button"
              tabIndex={0}
              onClick={() => handleRowClick(record)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleRowClick(record);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                minHeight: 44,
                padding: "12px 0",
                borderBottom: "1px solid var(--adaptiveGrey100)",
                cursor: "pointer",
              }}
            >
              <ListRow.Texts
                type="2RowTypeA"
                top={`${labelOf(EVENT_TYPE_LABEL, record.eventType)} · ${labelOf(RELATION_LABEL, record.relation)}`}
                bottom={record.eventDate}
              />
              <Paragraph.Text typography="st9">{formatNumber(record.amount)}원</Paragraph.Text>
            </div>
          ))}
        </div>
      )}

      <Spacing size={96} />
    </ScreenScaffold>
  );
}
