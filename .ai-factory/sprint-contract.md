# Sprint Contract: 전역 스토리지 상태 (StorageProvider + useStorage)

## 패킷 목표
앱 마운트 시 localStorage를 1회 읽어 Context로 배포하고, 변경 시 스토리지 래퍼를 호출해 메모리 상태를 동기화하는 경량 전역 스토어 구현.

## 만들 항목

| 파일 | 변경 내용 |
|------|---------|
| `src/store/StorageProvider.tsx` | `StorageContext` + `useStorage()` 훅, 마운트 시 초기화, 기본값 반환 |

## 사용할 타입 (src/lib/types.ts에서 import)
- `CalcInput`, `CalcResult`, `GiftRecord`, `Settings`, `LastCalc`, `RewardUnlock`, `WriteResult`

## 검증 조건
- ✅ `npx tsc --noEmit` — 타입 무결성 확인
- ✅ `npx vitest run` — 스토어 초기화·읽기·쓰기·기본값 반환 테스트
- ✅ localStorage가 마운트 시 1회만 읽혀야 함 (캐시됨)
- ✅ 모든 쓰기는 `setItem` 래퍼를 통함 (앱 전역에서 직접 localStorage 접근 금지)
- ✅ 기본값이 항상 반환됨 — 빈 저장소에서도 undefined 크래시 없음

## 절대 금지
- ❌ `main.tsx` 수정 — @AI:ANCHOR 파일. App.tsx의 `<StorageProvider>` 배선은 App.tsx 패킷에서 함
- ❌ `App.tsx` 라우팅 수정 — 이미 설정됨
- ❌ types.ts에서 새 타입 정의 — 구공용 타입만 사용

## 기본값 정책
- `giftRecords: [] | GiftRecord[]` (존재하지 않거나 손상되면 빈 배열)
- `settings: Settings` (모든 필드 기본값 포함)
- `lastCalc: null | LastCalc` (계산 이력 없으면 null)
- `rewardUnlock: null | RewardUnlock`

## 패킷 경계
- 다른 페이지·컴포넌트는 이 스토어를 import하지 않음 (App.tsx만 Provider 배치)
- 개별 페이지는 `useStorage()` 훅으로 필요한 데이터만 구독
