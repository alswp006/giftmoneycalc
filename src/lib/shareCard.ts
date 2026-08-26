import { ATTENDANCE_LABEL, EVENT_LABEL, RELATION_LABEL } from "@/lib/constants";
import { formatKRW } from "@/lib/format";
import type { CalcResult } from "@/lib/types";

const APP_NAME = "축의금 계산기";
const CARD_SIZE = 1080;
const BORDER_INSET = 24;

/**
 * @AI:NOTE 캔버스는 CSS 변수도 `currentColor`도 해석하지 못한다. 해석 못 하는 값을
 * fillStyle에 넣으면 **대입이 조용히 무시되고** 기본값(검정)이 그대로 남는다 —
 * 배경·글자가 모두 검정이 되어 카드가 새까맣게 나온다(2026-08-27 /share 실측).
 * 그래서 여기서는 "캔버스가 실제로 칠할 수 있는 문자열"만 통과시킨다.
 */
function isPaintable(value: string): boolean {
  return value !== "" && value !== "currentColor" && !value.startsWith("var(");
}

function cssVar(name: string): string {
  for (const element of [document.documentElement, document.body]) {
    if (!element) continue;
    const value = getComputedStyle(element).getPropertyValue(name).trim();
    if (isPaintable(value)) return value;
  }
  return "";
}

/**
 * CSS 변수 후보를 순서대로 읽고, 하나도 못 읽으면 페이지에서 계산된 색으로 대체한다.
 * TDSMobileAITProvider가 주입하는 이름(--adaptive*)이 실제 런타임 값이고,
 * --tds-color-*는 다른 테마 설정에서 쓰일 수 있어 먼저 시도한다.
 */
function readColor(varNames: string[], inherited: "color" | "backgroundColor"): string {
  try {
    for (const name of varNames) {
      const value = cssVar(name);
      if (isPaintable(value)) return value;
    }
    const computed = getComputedStyle(document.body ?? document.documentElement)[inherited];
    if (isPaintable(computed) && computed !== "rgba(0, 0, 0, 0)") return computed;
  } catch {
    /* 계산 스타일을 못 읽는 환경 — 아래 기본값으로 */
  }
  return inherited === "color" ? "black" : "white";
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

  const backgroundColor = readColor(
    ["--tds-color-background", "--adaptiveBackground"],
    "backgroundColor",
  );
  const textColor = readColor(
    ["--tds-color-text-primary", "--adaptiveGrey900"],
    "color",
  );
  const captionColor = readColor(
    ["--tds-color-text-secondary", "--adaptiveGrey600"],
    "color",
  );

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  // 흰 배경 카드가 흰 화면에 묻히지 않도록 얇은 테두리를 둔다(저장한 이미지에도 남는다).
  if (typeof ctx.strokeRect === "function") {
    ctx.strokeStyle = readColor(["--tds-color-grey200", "--adaptiveGrey200"], "color");
    ctx.lineWidth = 4;
    ctx.strokeRect(BORDER_INSET, BORDER_INSET, CARD_SIZE - BORDER_INSET * 2, CARD_SIZE - BORDER_INSET * 2);
  }

  ctx.textAlign = "center";

  ctx.fillStyle = captionColor;
  ctx.font = "500 40px sans-serif";
  ctx.fillText("적정 금액", CARD_SIZE / 2, CARD_SIZE / 2 - 120);

  ctx.fillStyle = textColor;
  ctx.font = "bold 96px sans-serif";
  ctx.fillText(formatKRW(result.recommended), CARD_SIZE / 2, CARD_SIZE / 2);

  ctx.fillStyle = captionColor;
  ctx.font = "400 40px sans-serif";
  ctx.fillText(buildConditionSummary(result), CARD_SIZE / 2, CARD_SIZE / 2 + 100);

  ctx.font = "500 32px sans-serif";
  ctx.fillText(APP_NAME, CARD_SIZE / 2, CARD_SIZE - 80);
}

/**
 * 공유 문구를 빌드한다 (순수 함수). 외부 링크나 다운로드 유도 문구를 포함하지 않는다.
 */
export function buildShareText(result: CalcResult): string {
  const amount = formatKRW(result.recommended);
  const condition = buildConditionSummary(result);
  return `${condition}에는 ${amount}이 적당해요.\n${APP_NAME}으로 계산했어요.`;
}
