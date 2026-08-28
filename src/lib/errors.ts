import type { AppErrorCode, Result } from "@/lib/types";

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  401: "토스 앱에서 광고를 보면 상세 리포트를 열 수 있어요",
  403: "권한이 없어 이 화면을 볼 수 없어요",
  404: "삭제되었거나 없는 기록이에요",
  409: "다른 화면에서 이미 수정된 기록이에요. 새로고침 후 다시 시도해주세요",
  413: "저장할 수 있는 용량을 넘었어요. 오래된 기록을 정리해 주세요",
  416: "모든 기록을 다 봤어요",
  422: "입력값을 다시 확인해 주세요",
  500: "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요",
  507: "기기 저장 공간이 부족해요",
};

export function getErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code];
}

export function fail(code: AppErrorCode) {
  return { ok: false as const, error: { code, message: ERROR_MESSAGES[code] } };
}

export function ok<T>(data: T) {
  return { ok: true as const, data };
}

// Compile-time check: both helpers stay assignable to the shared Result<T> shape.
const _failCheck: Result<never> = fail(404);
const _okCheck: Result<{ x: number }> = ok({ x: 1 });
void _failCheck;
void _okCheck;
