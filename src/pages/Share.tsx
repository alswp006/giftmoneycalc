import { useEffect, useRef, useState } from "react";
import { Top, Paragraph, Spacing, Toast } from "@toss/tds-mobile";
import { setClipboardText } from "@apps-in-toss/web-framework";
import { useLocation, useNavigate } from "react-router-dom";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { ButtonStack } from "../components/BottomCTA";
import { Card } from "../components/Card";
import { LoadingState } from "../components/StateView";
import { useStorage } from "../store/StorageProvider";
import { buildShareText, drawShareCard } from "../lib/shareCard";
import { calcGiftAmount } from "../lib/calc";
import type { CalcResult } from "../lib/types";

export default function Share() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, lastCalc } = useStorage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const incoming = (location.state ?? null) as { result?: CalcResult } | null;
  const result =
    incoming?.result ?? (lastCalc ? (lastCalc.result ?? calcGiftAmount(lastCalc.input)) : null);

  useEffect(() => {
    if (ready && result == null) navigate("/calc", { replace: true });
  }, [ready, result, navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    try {
      drawShareCard(canvas, result);
    } catch {
      /* 캔버스를 못 그리는 환경(구형 WebView 등) — 버튼 안내로 대체 */
    }
  }, [result]);

  function saveImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement("a");
      link.download = "축의금-계산결과.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      setToast("이미지를 저장했어요");
    } catch {
      setToast("저장하지 못했어요");
    }
  }

  async function copyText() {
    if (!result) return;
    const text = buildShareText(result);
    try {
      // .d.ts 검증: setClipboardText는 문자열 인자를 받는다(객체 아님).
      await Promise.resolve(setClipboardText(text));
      setToast("문구를 복사했어요");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setToast("문구를 복사했어요");
      } catch {
        setToast("복사하지 못했어요");
      }
    }
  }

  if (!result) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>공유 카드</Top.TitleParagraph>} />}>
        <LoadingState rows={2} />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>공유 카드</Top.TitleParagraph>} />}
      bottom={
        <ButtonStack
          primary={{ label: "이미지 저장", onClick: saveImage }}
          secondary={{ label: "문구 복사", onClick: () => void copyText() }}
        />
      }
    >
      <Spacing size={8} />
      <Card>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", aspectRatio: "1 / 1", display: "block", borderRadius: 12 }}
        />
      </Card>
      <Spacing size={12} />
      <Paragraph.Text typography="st12">
        개인 이름은 카드에 담기지 않아요. 저장하거나 문구를 복사해 원하는 곳에 보내세요.
      </Paragraph.Text>
      <Spacing size={140} />

      <Toast
        open={toast != null}
        position="bottom"
        text={toast ?? ""}
        onClose={() => setToast(null)}
      />
    </ScreenScaffold>
  );
}
