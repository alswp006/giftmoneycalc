# Sprint Contract: 탭 레이아웃 래퍼 + NotFound 화면

## 만들 항목
- **`src/components/AppLayout.tsx`**: children 컴포넌트 아래 FloatingTabBar 고정. Safe-area 기반 하단 여백 확보 (paddingBottom). 탭 활성 인덱스는 useLocation 기반 현재 경로로 자동 결정.
- **`src/pages/NotFound.tsx`**: 알 수 없는 경로 접근 시 표시. PageShell + 아이콘 + 설명("페이지를 찾을 수 없습니다") + 홈 버튼(weak).

## 사용할 TypeScript 타입
- `import type { RouteState } from "@/lib/types"`
- `import { useLocation } from "react-router-dom"`
- FloatingTabBar props: `tabs` array(label, icon, path), `activeIndex`, `onChange`

## 검증 방법
- `npx tsc --noEmit` — 타입 에러 0건
- `npx vitest run` — AppLayout이 현재 경로에 맞춰 탭 활성 상태 설정 테스트
- `npm run test:visual` — 하단 탭바 고정, 안전영역 반영 여백 확인

## 절대 하면 안 되는 것
- App.tsx 라우트 등록 금지 → 다음 통합 패킷에서 처리
- AppLayout을 App.tsx에 배선하지 말 것 → 다음 패킷
- NotFound를 catch-all route에 등록하지 말 것 → 다음 패킷
- FloatingTabBar 직접 import 금지 → AppLayout 내에서만 사용하도록 캡슐화
