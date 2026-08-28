# Sprint Contract: App.tsx 라우팅 + FloatingTabBar + 오버레이 수명주기

## 1. 만들 항목

| 파일 | 내용 |
|------|------|
| `src/App.tsx` | 라우트 8개(Home/Calculate/Result/Share/History/Settings/etc) + FloatingTabBar 배선(탭-루트 4화면) + 전역 Provider(TDS, 광고, SDK) + useOverlayLifecycle 훅 호출 |
| `src/hooks/useOverlayLifecycle.ts` | 라우트 변경/뒤로가기 시 열린 BottomSheet/AlertDialog 전부 닫고 body 스크롤 잠금 해제하는 커스텀 훅 |

## 2. 사용할 TypeScript 타입

- import type { RouteState, EventType, Relationship, Region, CalcInput, CalcResult, GiftRecord, AppSettings } from "@/lib/types"

## 3. 검증 방법

- `npx tsc --noEmit` — 타입 에러 0건
- `npx vitest run` — 기존 테스트 모두 통과
- `npx vite build` — 미해결 import 0건, 빌드 성공

## 4. 절대 하면 안 되는 것

- ❌ main.tsx 수정 금지 (TDSMobileAITProvider/BrowserRouter 이미 설정)
- ❌ FloatingTabBar 없이 raw nav/Tab 사용 금지
- ❌ useOverlayLifecycle 훅 없이 라우트 변경 시 오버레이 정리 금지
- ❌ body scroll-lock을 position:fixed로 대체 금지
- ❌ navigate state가 types.ts의 RouteState와 불일치 금지
