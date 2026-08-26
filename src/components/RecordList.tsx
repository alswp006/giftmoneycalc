import { Button, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { formatDate, formatKRW } from "../lib/format";
import { EVENT_LABEL } from "../lib/constants";
import type { GiftRecord } from "../lib/types";

/**
 * 정렬·필터가 끝난 기록 목록을 20건 단위로 렌더한다 — 나머지는 '더 보기'로 이어서.
 *
 * Pre-built 조합: 행 자체가 삭제/수정 진입점이라 onClick만 부모(History)로 위임하고,
 * 실제 액션 시트는 RecordActionSheet가 담당한다(행 내부 버튼 없음 — 중첩 방지).
 */
export function RecordList({
  records,
  visibleCount,
  onLoadMore,
  onSelect,
}: {
  records: GiftRecord[];
  visibleCount: number;
  onLoadMore: () => void;
  onSelect: (record: GiftRecord) => void;
}) {
  const shown = records.slice(0, visibleCount);
  const remaining = records.length - shown.length;

  return (
    <>
      {shown.map((record) => (
        <div
          key={record.id}
          data-testid="record-row"
          role="button"
          tabIndex={0}
          onClick={() => onSelect(record)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(record);
          }}
        >
          <ListRow
            withTouchEffect
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={record.personName}
                bottom={`${EVENT_LABEL[record.eventType]} · ${formatDate(record.date)}`}
              />
            }
            right={
              <Paragraph.Text typography="t6">
                {record.direction === "given" ? "-" : "+"}
                {formatKRW(record.amount)}
              </Paragraph.Text>
            }
          />
        </div>
      ))}
      {remaining > 0 && (
        <>
          <Spacing size={12} />
          <Button variant="weak" display="block" onClick={onLoadMore}>
            {remaining}건 더 보기
          </Button>
        </>
      )}
    </>
  );
}
