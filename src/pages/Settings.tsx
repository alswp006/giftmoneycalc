import { useState } from "react";
import {
  Top,
  Paragraph,
  Spacing,
  ListRow,
  Switch,
  AlertDialog,
  Toast,
} from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { ChipGroup } from "../components/ChipGroup";
import { useStorage } from "../store/StorageProvider";
import { regionOptions } from "../lib/options";
import type { RegionType } from "../lib/types";

function fireTickHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Settings() {
  const { ready, settings, updateSettings, records, clearAll } = useStorage();
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function saveSetting(next: typeof settings) {
    const written = updateSettings(next);
    if (!written.ok) setToast("설정을 저장하지 못했어요");
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />}>
      <Spacing size={8} />
      <ChipGroup
        label="기본 지역"
        options={regionOptions}
        value={settings.defaultRegion}
        onChange={(next) => saveSetting({ ...settings, defaultRegion: next as RegionType })}
        testId="group-defaultRegion"
      />

      <Spacing size={24} />
      <ListRow
        contents={
          <ListRow.Texts type="2RowTypeA" top="간결한 목록" bottom="기록을 한 줄로 표시해요" />
        }
        right={
          <Switch
            checked={settings.compactList}
            disabled={!ready}
            onChange={() => {
              fireTickHaptic();
              saveSetting({ ...settings, compactList: !settings.compactList });
            }}
          />
        }
      />

      <ListRow
        contents={
          <ListRow.Texts
            type="2RowTypeA"
            top="데이터 초기화"
            bottom={`저장된 기록 ${records.length}건을 지워요`}
          />
        }
        onClick={() => setResetOpen(true)}
      />

      <Spacing size={24} />
      <Paragraph.Text typography="st12">
        관례 기준 참고값을 제공하는 계산기예요. 기록은 이 기기에만 저장돼요.
      </Paragraph.Text>
      <Spacing size={24} />

      <AlertDialog
        open={resetOpen}
        title="데이터를 초기화할까요?"
        description="저장한 기록이 모두 사라져요. 설정은 그대로 남아요."
        alertButton={
          <AlertDialog.AlertButton
            onClick={() => {
              clearAll();
              setResetOpen(false);
              setToast("데이터를 초기화했어요");
            }}
          >
            초기화
          </AlertDialog.AlertButton>
        }
        onClose={() => setResetOpen(false)}
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
