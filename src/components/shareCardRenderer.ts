import { formatNumber } from "@/lib/utils";

export type ShareCardData = {
  amount: number;
  eventType: string;
  relation?: string;
  eventDate: string;
  counterpartLabel?: string;
  memo?: string;
};

const CANVAS_SIZE = 1080;

const EVENT_TYPE_LABEL: Record<string, string> = {
  WEDDING: "결혼식",
  FUNERAL: "장례식",
  FIRST_BIRTHDAY: "돌잔치",
  OPENING: "개업식",
};

const RELATION_LABEL: Record<string, string> = {
  FAMILY: "가족",
  RELATIVE: "친척",
  CLOSE_FRIEND: "친한 친구",
  FRIEND: "친구",
  COWORKER: "동료",
  ACQUAINTANCE: "지인",
};

function readColor(varName: string, fallback: string): string {
  try {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Draws a 1080x1080 share card onto `canvas`. Never draws `data.counterpartLabel` or
 * `data.memo` — those are personal information and must never leave the device via a
 * shareable image.
 */
export function renderShareCard(canvas: HTMLCanvasElement, data: ShareCardData): boolean {
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const backgroundColor = readColor("--adaptiveBackground", "#ffffff");
  const foregroundColor = readColor("--adaptiveGrey900", "#000000");
  const mutedColor = readColor("--adaptiveGrey600", "#000000");

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const eventLabel = EVENT_TYPE_LABEL[data.eventType] ?? data.eventType;
  const relationLabel = data.relation ? (RELATION_LABEL[data.relation] ?? data.relation) : "";

  ctx.fillStyle = mutedColor;
  ctx.font = "500 40px sans-serif";
  ctx.fillText(eventLabel, CANVAS_SIZE / 2, 360);

  ctx.fillStyle = foregroundColor;
  ctx.font = "700 96px sans-serif";
  ctx.fillText(`${formatNumber(Math.round(data.amount))}원`, CANVAS_SIZE / 2, 500);

  ctx.fillStyle = mutedColor;
  ctx.font = "400 32px sans-serif";
  const subLabel = relationLabel ? `${relationLabel} · ${data.eventDate}` : data.eventDate;
  ctx.fillText(subLabel, CANVAS_SIZE / 2, 620);

  return true;
}
