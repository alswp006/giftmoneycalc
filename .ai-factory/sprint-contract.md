# Sprint Contract: CalculateForm 컴포넌트

## 만들 항목
- **파일**: `src/components/CalculateForm.tsx`
- **역할**: 계산 입력 폼의 순수 프레젠테이션 컴포넌트 (제어 컴포넌트)
- **구성**: 행사 유형 Chip 4종 + 관계 Chip 6종 + 참석 Switch + 동반 인원 TextField + 행사 날짜 TextField
- **props**: `value: CalculationInput` + `onChange: (input: Partial<CalculationInput>) => void`

## 사용할 TypeScript 타입
- `import type { CalculationInput, EventType, Relation } from "@/lib/types"`
- `import { EVENT_TYPES, RELATIONS } from "@/lib/types"`

## 검증 방법
- `npx tsc --noEmit` — 타입 에러 0건
- `npx vitest run` — 폼 액션 테스트(선택, 입력 필드 업데이트, 라벨링)
- `npm run test:visual` — 각 입력 요소가 시각적으로 정상인지 확인 (Chip 선택 상태, Switch, TextField placeholder)

## 절대 하면 안 되는 것
- 라우팅/navigate 호출 금지 → 값 변경만
- 저장소(localStorage/SDK) 접근 금지 → props로만 제어
- 하단 고정 CTA 렌더 금지 → 조립 화면이 소유
- TDS 컴포넌트 마진/패딩 오버라이드 금지 → Spacing으로만 간격 생성
- 버튼 중첩 금지 (`<button>` 안에 `<Button>` 금지) → CTA는 조립 화면에서
