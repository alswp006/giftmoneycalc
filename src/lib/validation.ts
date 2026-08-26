/** 폼 필드 검증 — 순수 함수. 통과 시 null, 실패 시 한글 에러 메시지를 반환한다. */

export function validatePersonName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "이름을 적어주세요";
  if (trimmed.length > 20) return "이름을 20자 이내로 적어주세요";
  return null;
}

export function validateAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount < 1000 || amount > 10000000) {
    return "1,000원부터 10,000,000원까지 적을 수 있어요";
  }
  if (amount % 1000 !== 0) return "금액은 1,000원 단위로 적어주세요";
  return null;
}

export function validateDate(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "날짜를 YYYY-MM-DD로 적어주세요";
  return null;
}

export function validateMemo(memo: string): string | null {
  if (memo.length > 50) return "메모는 50자까지 적을 수 있어요";
  return null;
}
