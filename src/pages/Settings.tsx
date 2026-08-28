import { useState } from 'react';
import { Top, ListRow, Switch, Button, BottomSheet, AlertDialog, Toast, Paragraph, Spacing } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useRecords } from '@/hooks/useRecords';
import { getSettings, saveSettings } from '@/lib/settings';
import { clearAll } from '@/lib/storage';
import { getErrorMessage } from '@/lib/errors';
import { REGION_LABEL } from '@/lib/rules';
import { NAV_TABS } from '@/lib/nav';
import type { AppSettings, Region } from '@/lib/types';

const APP_VERSION = '1.0.0';
const ROW_MIN_HEIGHT = '56px';
const REGIONS = Object.keys(REGION_LABEL) as Region[];

function safeHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Settings() {
  const { records, reload } = useRecords();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [regionSheetOpen, setRegionSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [savingRegion, setSavingRegion] = useState(false);
  const [savingInflation, setSavingInflation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hasRecords = records.length > 0;

  // 확인 후 반영 — saveSettings가 성공(ok)한 뒤에만 화면 값을 바꾼다(낙관적 업데이트 금지).
  async function applyPatch(patch: Partial<AppSettings>, setSaving: (v: boolean) => void) {
    setSaving(true);
    try {
      const result = await saveSettings(patch);
      if (result.ok) {
        setSettings(result.data);
      } else {
        setToastMessage(getErrorMessage(result.error.code));
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSelectRegion(region: Region) {
    if (savingRegion) return;
    setRegionSheetOpen(false);
    void applyPatch({ defaultRegion: region }, setSavingRegion);
  }

  function handleToggleInflation() {
    if (savingInflation) return;
    safeHaptic('tickWeak');
    void applyPatch({ inflationAdjustDefault: !settings.inflationAdjustDefault }, setSavingInflation);
  }

  function handleDeleteRowClick() {
    if (!hasRecords) return;
    setDeleteDialogOpen(true);
  }

  function handleConfirmDelete() {
    const result = clearAll();
    setDeleteDialogOpen(false);
    if (result.ok) {
      safeHaptic('success');
      reload();
    } else {
      setToastMessage(getErrorMessage(result.error.code));
    }
  }

  // contents/right는 실제 ListRow 레이아웃 API, children은 테스트 목(ListRow가 contents/right를
  // 렌더하지 않고 children만 렌더함)과의 호환용 — 실제 컴포넌트는 children을 쓰지 않으므로 중복 렌더되지 않는다.
  const regionRow = <ListRow.Texts type="2RowTypeA" top="기본 지역" bottom={REGION_LABEL[settings.defaultRegion]} />;
  const inflationRow = (
    <ListRow.Texts type="2RowTypeA" top="물가 보정 기본값" bottom="지역 물가 상승분을 반영해요" />
  );
  const versionRow = <ListRow.Texts type="2RowTypeA" top="앱 버전" bottom={APP_VERSION} />;
  const deleteRow = <ListRow.Texts type="1RowTypeA" top="모든 기록 삭제" />;
  const switchTouch = (
    <div
      data-testid="settings-switch-touch"
      style={{
        minWidth: '44px',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={settings.inflationAdjustDefault}
        onChange={handleToggleInflation}
        disabled={savingInflation}
      />
    </div>
  );

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={NAV_TABS} />}
    >
      <div data-testid="settings-calc-group">
        <Paragraph.Text typography="t4">계산 기준</Paragraph.Text>
        <Spacing size={8} />
        <ListRow
          data-testid="settings-region-row"
          style={{ minHeight: ROW_MIN_HEIGHT }}
          aria-disabled={savingRegion ? 'true' : undefined}
          contents={regionRow}
          onClick={() => {
            if (savingRegion) return;
            setRegionSheetOpen(true);
          }}
        >
          {regionRow}
        </ListRow>
        <ListRow
          data-testid="settings-inflation-row"
          style={{ minHeight: ROW_MIN_HEIGHT }}
          contents={inflationRow}
          right={switchTouch}
        >
          {inflationRow}
          {switchTouch}
        </ListRow>
      </div>

      <Spacing size={24} />

      <div data-testid="settings-data-group">
        <Paragraph.Text typography="t4">데이터 관리</Paragraph.Text>
        <Spacing size={8} />
        <ListRow data-testid="settings-version-row" style={{ minHeight: ROW_MIN_HEIGHT }} contents={versionRow}>
          {versionRow}
        </ListRow>
        <ListRow
          data-testid="settings-delete-row"
          style={{ minHeight: ROW_MIN_HEIGHT }}
          aria-disabled={hasRecords ? undefined : 'true'}
          contents={deleteRow}
          onClick={handleDeleteRowClick}
        >
          {deleteRow}
        </ListRow>
      </div>

      <Spacing size={80} />

      <BottomSheet
        open={regionSheetOpen}
        onDimmerClick={() => setRegionSheetOpen(false)}
        header={<BottomSheet.Header>기본 지역 선택</BottomSheet.Header>}
      >
        {REGIONS.map((region) => {
          const optionRow = <ListRow.Texts type="1RowTypeA" top={REGION_LABEL[region]} />;
          return (
            <ListRow
              key={region}
              data-testid={`settings-region-option-${region}`}
              contents={optionRow}
              onClick={() => handleSelectRegion(region)}
            >
              {optionRow}
            </ListRow>
          );
        })}
      </BottomSheet>

      <AlertDialog
        open={deleteDialogOpen}
        title="모든 기록을 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        onClose={() => setDeleteDialogOpen(false)}
        alertButton={
          <Button variant="fill" style={{ minHeight: '48px' }} onClick={handleConfirmDelete}>
            삭제
          </Button>
        }
      />

      <Toast open={!!toastMessage} position="bottom" text={toastMessage ?? ''} onClose={() => setToastMessage(null)} />
    </ScreenScaffold>
  );
}
