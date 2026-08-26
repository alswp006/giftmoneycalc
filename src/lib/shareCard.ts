import { ATTENDANCE_LABEL, EVENT_LABEL, RELATION_LABEL } from "@/lib/constants";
import { formatKRW } from "@/lib/format";
import type { CalcResult } from "@/lib/types";

const APP_NAME = "축의금 계산기";
const CARD_SIZE = 1080;

function readColor(varName: string): string {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || "currentColor";
  } catch {
    return "currentColor";
  }
}

function buildConditionSummary(result: CalcResult): string {
  const { eventType, relation, attendance } = result.input;
  return `${EVENT_LABEL[eventType]} · ${RELATION_LABEL[relation]} · ${ATTENDANCE_LABEL[attendance]}`;
}

/**
 * CalcResult를 1080x1080 공유 카드 캔버스에 그린다 (순수 렌더 함수, 스토리지 접근 없음).
 * 색상은 getComputedStyle로 --tds-color-* 변수를 읽어 사용한다(HEX 리터럴 금지).
 */
export function drawShareCard(canvas: HTMLCanvasElement, result: CalcResult): void {
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const backgroundColor = readColor("--tds-color-background");
  const textColor = readColor("--tds-color-text-primary");

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  ctx.fillStyle = textColor;
  ctx.textAlign = "center";

  ctx.font = "bold 96px sans-serif";
  ctx.fillText(formatKRW(result.recommended), CARD_SIZE / 2, CARD_SIZE / 2);

  ctx.font = "400 40px sans-serif";
  ctx.fillText(buildConditionSummary(result), CARD_SIZE / 2, CARD_SIZE / 2 + 100);

  ctx.font = "500 32px sans-serif";
  ctx.fillText(APP_NAME, CARD_SIZE / 2, CARD_SIZE - 80);
}

/**
 * 공유 문구를 빌드한다 (순수 함수). 외부 링크·앱 설치 유도 문구를 포함하지 않는다.
 */
export function buildShareText(result: CalcResult): string {
  const amount = formatKRW(result.recommended);
  const condition = buildConditionSummary(result);
  return `${condition}에는 ${amount}이 적당해요.\n${APP_NAME}으로 계산했어요.`;
}
