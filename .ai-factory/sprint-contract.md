# Sprint Contract: 온보딩 다이얼로그 + 에러 바운더리

## 만들 항목
- **`src/components/OnboardingDialog.tsx`**: AlertDialog 래퍼. 'gyeongjo:v1:onboarded' 플래그 없으면 마운트 시 참고용 금액 안내 AlertDialog 1회 노출. 닫으면 플래그 저장 후 children 렌더.
- **`src/components/AppErrorBoundary.tsx`**: 클래스형 에러 바운더리. 자식 컴포넌트 렌더 예외 캐치 → 복구 버튼(새로고침) + 에러 메시지 표시. App.tsx 배선은 다음 패킷.

## 사용할 TypeScript 타입
- `import type { CalculationInput, RouteState } from "@/lib/types"`
- `import { localStorage 헬퍼 } from "@/lib/storage"` (이미 존재)

## 검증 방법
- `npx tsc --noEmit` — 타입 에러 0건
- `npx vitest run` — 다이얼로그 1회 노출 + 플래그 저장 테스트, 에러 바운더리 예외 캐치 테스트
- `npm run test:visual` — 다이얼로그 렌더, 닫기 버튼 클릭 시 사라짐 확인

## 절대 하면 안 되는 것
- main.tsx 수정 금지 → 다음 통합 패킷에서 App.tsx에 배선
- App.tsx 수정 금지 → 다음 통합 패킷에서 통합
- localStorage 키명 다름 (반드시 'gyeongjo:v1:onboarded' 사용)
- 다이얼로그 children(페이지)를 막거나 숨기지 말 것 → 닫기 후 항상 렌더
