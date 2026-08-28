import { useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Top, ListRow, Paragraph, Chip, Button, AlertDialog } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { Amount } from '@/components/Amount';
import { RecordSheet } from '@/components/RecordSheet';
import { deleteRecord, queryRecords } from '@/lib/records';
import { ERROR_MESSAGES } from '@/lib/errors';
import { EVENT_TYPE_LABEL, RELATIONSHIP_LABEL } from '@/lib/rules';
import type { GiftRecord } from '@/lib/types';

const CTA_MIN_HEIGHT = '48px';

const FIXED_BOTTOM_STYLE: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '12px 16px calc(var(--toss-safe-area-bottom) + 12px)',
  backgroundColor: 'var(--adaptiveBackground)',
};

function safeHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

function findRecord(id: string | undefined): GiftRecord | null {
  if (!id) return null;
  return queryRecords().find((r) => r.id === id) ?? null;
}

function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<GiftRecord | null>(() => findRecord(id));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleEditClick() {
    safeHaptic('tickWeak');
    setSheetOpen(true);
  }

  function handleSheetClose() {
    setSheetOpen(false);
    const latest = findRecord(id);
    setRecord(latest);
    if (!latest) {
      navigate('/history', { replace: true });
    }
  }

  function handleSheetSaved(updated: GiftRecord) {
    setRecord(updated);
    setSheetOpen(false);
  }

  function handleDeleteClick() {
    setDeleteOpen(true);
  }

  function handleConfirmDelete() {
    if (!id) return;
    const result = deleteRecord(id);
    setDeleteOpen(false);
    if (result.ok) {
      safeHaptic('success');
      navigate('/history', { replace: true });
      return;
    }
    setRecord(null);
  }

  if (!record) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>기록 상세</Top.TitleParagraph>} />}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px' }}>
          <Paragraph.Text typography="t5">{ERROR_MESSAGES[404]}</Paragraph.Text>
          <div style={{ height: 20 }} />
          <Button
            variant="fill"
            display="block"
            style={{ minHeight: CTA_MIN_HEIGHT }}
            onClick={() => navigate('/history')}
          >
            목록으로
          </Button>
        </div>
      </ScreenScaffold>
    );
  }

  const nameRow = <ListRow.Texts type="2RowTypeA" top="이름" bottom={record.personName} />;
  const eventRow = <ListRow.Texts type="1RowTypeA" top="행사" />;
  const eventChip = <Chip>{EVENT_TYPE_LABEL[record.eventType]}</Chip>;
  const relationshipRow = <ListRow.Texts type="1RowTypeA" top="관계" />;
  const relationshipChip = <Chip>{RELATIONSHIP_LABEL[record.relationship]}</Chip>;
  const dateRow = <ListRow.Texts type="2RowTypeA" top="날짜" bottom={record.eventDate} />;
  const memoRow = <ListRow.Texts type="2RowTypeA" top="메모" bottom={record.memo ?? '메모 없음'} />;
  const createdRow = (
    <ListRow.Texts type="2RowTypeA" top="기록일" bottom={formatCreatedAt(record.createdAt)} />
  );

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>기록 상세</Top.TitleParagraph>} />}
      bottom={
        <div style={FIXED_BOTTOM_STYLE}>
          <Button
            variant="fill"
            display="block"
            style={{ minHeight: CTA_MIN_HEIGHT }}
            onClick={handleEditClick}
          >
            수정하기
          </Button>
        </div>
      }
    >
      <Card testId="record-detail-card">
        <Amount value={record.amount} unit="원" typography="t3" />
        <div style={{ height: 12 }} />

        <ListRow contents={nameRow}>{nameRow}</ListRow>
        <ListRow contents={eventRow} right={eventChip}>
          {eventRow}
          {eventChip}
        </ListRow>
        <ListRow contents={relationshipRow} right={relationshipChip}>
          {relationshipRow}
          {relationshipChip}
        </ListRow>
        <ListRow contents={dateRow}>{dateRow}</ListRow>
        <ListRow contents={memoRow}>{memoRow}</ListRow>
        <ListRow contents={createdRow}>{createdRow}</ListRow>
      </Card>

      <div style={{ height: 16 }} />

      <Button
        variant="weak"
        display="block"
        style={{ minHeight: CTA_MIN_HEIGHT }}
        onClick={handleDeleteClick}
      >
        삭제
      </Button>

      <div style={{ height: 96 }} />

      <RecordSheet
        open={sheetOpen}
        mode="edit"
        initial={record}
        onClose={handleSheetClose}
        onSaved={handleSheetSaved}
      />

      <AlertDialog
        open={deleteOpen}
        title="기록을 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        onClose={() => setDeleteOpen(false)}
        alertButton={
          <Button
            variant="fill"
            style={{ minHeight: CTA_MIN_HEIGHT }}
            onClick={handleConfirmDelete}
          >
            삭제
          </Button>
        }
      />
    </ScreenScaffold>
  );
}
