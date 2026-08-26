/**
 * 원화 금액을 "1,234,567원" 형식으로 포맷한다.
 * NaN/Infinity 등 숫자로 표시할 수 없는 값은 "0원"으로 안전하게 대체한다(흰 화면 방지).
 */
export function formatKRW(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0원";
  }

  const rounded = Math.round(amount);
  return rounded.toLocaleString("ko-KR") + "원";
}

/**
 * KRW 금액 포맷 — 전체 화면 공용 (contract.ts: formatAmountKrwFn).
 * opts.short가 true면 "5만원"/"1.2억원" 같은 축약 표기를 반환한다(요약 히어로 등 좁은 공간용).
 * NaN/Infinity는 "0원"으로 안전 처리한다.
 */
export function formatAmountKrw(amount: number, opts?: { short?: boolean }): string {
  if (!Number.isFinite(amount)) {
    return "0원";
  }

  const rounded = Math.round(amount);

  if (!opts?.short) {
    return rounded.toLocaleString("ko-KR") + "원";
  }

  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);

  if (abs >= 100000000) {
    const eok = Math.round((abs / 100000000) * 10) / 10;
    return sign + eok + "억원";
  }

  if (abs >= 10000) {
    const man = Math.round((abs / 10000) * 10) / 10;
    return sign + man + "만원";
  }

  return sign + abs.toLocaleString("ko-KR") + "원";
}

/**
 * 날짜 포맷 — 0008(홈), 0012(히스토리)에서 사용 (contract.ts: formatDateFn).
 * 입력은 "YYYY-MM-DD" 문자열. short: "8월 27일" / long: "2026년 8월 27일".
 * 형식이 맞지 않는 입력은 빈 문자열로 안전 처리한다(흰 화면 방지).
 */
export function formatDate(date: string, format: "short" | "long" = "short"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) {
    return "";
  }

  const [, year, month, day] = match;
  const monthNum = Number(month);
  const dayNum = Number(day);

  if (format === "long") {
    return `${year}년 ${monthNum}월 ${dayNum}일`;
  }

  return `${monthNum}월 ${dayNum}일`;
}
