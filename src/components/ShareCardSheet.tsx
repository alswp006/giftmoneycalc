import { useEffect, useRef, useState } from "react";
import { BottomSheet, Paragraph, Spacing, Button, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { renderShareCard } from "@/components/shareCardRenderer";
import type { ShareCardData } from "@/components/shareCardRenderer";

const RENDER_FAIL_TEXT = "공유 카드를 만들지 못했어요";

type ShareCardSheetProps = {
  open: boolean;
  data: ShareCardData;
  onClose: () => void;
};

function fireSaveHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  try {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    /* 다운로드 트리거 실패는 조용히 무시 — 미리보기는 이미 화면에 있다 */
  }
}

export default function ShareCardSheet({ open, data, onClose }: ShareCardSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ok = false;
    try {
      ok = renderShareCard(canvas, data);
    } catch {
      ok = false;
    }

    if (!ok) {
      setToastText(RENDER_FAIL_TEXT);
      onClose();
    }
    // 계약: 렌더는 open 전환에만 반응한다 — data 변경은 재오픈 시 반영됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    fireSaveHaptic();
    downloadDataUrl(dataUrl, "gift-share-card.png");
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <Paragraph.Text typography="t4">공유 카드를 만들었어요</Paragraph.Text>
        <Spacing size={16} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <canvas
            ref={canvasRef}
            data-testid="share-card-canvas"
            style={{ width: "100%", maxWidth: 320, aspectRatio: "1 / 1", borderRadius: 16 }}
          />
        </div>
        <Spacing size={24} />
        <Button variant="fill" display="block" size="large" data-testid="share-save-button" onClick={handleSave}>
          이미지로 저장하기
        </Button>
        <Spacing size={8} />
        <Button variant="weak" display="block" size="large" onClick={onClose}>
          닫기
        </Button>
        <Spacing size={8} />
      </BottomSheet>
      <Toast
        open={toastText !== ""}
        position="bottom"
        text={toastText}
        onClose={() => setToastText("")}
      />
    </>
  );
}
