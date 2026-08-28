# Changelog

## [0.1.0] - 2026-08-28

14/20 packets completed.

### Added
- feat: 도메인 타입 · AppErrorCode · RouteState 정의 (packet 0001)
- feat: 오류 문구 단일 소스 errors.ts + 하드코딩 검증 스크립트 (packet 0002)
- feat: localStorage CRUD 기반 모듈 (키 격리 · 413 · 507) (packet 0003)
- feat: 레코드 도메인 연산 (409 중복·낙관적 잠금 · 404 · subscribeRecords) (packet 0004)
- feat: 설정 저장 계층 (확인 후 반영 · 리워드 24시간 해제) (packet 0005)
- feat: 계산 엔진 (rules.ts 상수 격리 + calc.ts 결정론 함수) (packet 0006)
- feat: 통계 집계 함수 + 상태 관리 훅 (useRecords · useSettings) (packet 0007)
- feat: 홈 화면 `/` (packet 0008)
- feat: 결과 상세 리워드 게이트 (TossRewardAd · 24시간 해제) (packet 0011)
- feat: 히스토리 추가·수정 BottomSheet (409 중복 확인 다이얼로그) (packet 0013)
- feat: 통계 `/stats` — 요약 영역 (packet 0015)
- feat: 통계 상세 시각화 + 리워드 게이트 + 401 (packet 0016)
- feat: 공유 카드 `/share` (packet 0017)
- feat: 설정 `/settings` (확인 후 반영 · 전체 삭제) (packet 0018)

### Known Issues
- 계산 입력 화면 `/calc` (packet 0009) — failed
- 결과 화면 `/result` — 기본 레이아웃 (packet 0010) — failed
- 히스토리 목록 `/history` — 목록 · 필터 · 416 (packet 0012) — failed
- 히스토리 상세 `/history/:id` (404 · 수정 · 삭제) (packet 0014) — failed
- 라우팅 + FloatingTabBar + 오버레이 수명주기 배선 (App.tsx 단독 소유) (packet 0019) — failed
- 광고 env 안전 가드 + 정책·격리 정적 검증 스크립트 (packet 0020) — failed
