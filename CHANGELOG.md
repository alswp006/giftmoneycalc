# Changelog

## [0.1.0] - 2026-08-27

17/20 packets completed.

### Added
- feat: 도메인 타입·열거형·RouteState 선언 (packet 0001)
- feat: 룰 테이블 상수 · 저장소 키 · Envelope 타입 (packet 0002)
- feat: 계산 엔진 calculate() + 집계 aggregate() + 결정론 스캔 테스트 (packet 0003)
- feat: 저장소 저수준 I/O — Envelope 읽기/쓰기 · 손상 격리 · 마이그레이션 · UUID 폴백 (packet 0004)
- feat: 레코드 CRUD + 설정·리워드·온보딩 저장소 (packet 0005)
- feat: 상태 관리 — RecordsProvider + useRecords (낙관적 업데이트·롤백) (packet 0006)
- feat: 계산 입력 폼 컴포넌트 CalculateForm (packet 0007)
- feat: 기록 저장 BottomSheet 컴포넌트 SaveRecordSheet (packet 0008)
- feat: 공유 카드 — Canvas 렌더러 + ShareCardSheet (packet 0009)
- feat: 통계 상세 차트 컴포넌트 StatsDetail (MiniBar · Sparkline) (packet 0010)
- feat: 광고 컴포넌트 — ResultBanner · RewardGate · 광고 식별자 접근자 (packet 0011)
- feat: 온보딩 다이얼로그 + 에러 바운더리 컴포넌트 (packet 0012)
- feat: 탭 레이아웃 래퍼 + NotFound 화면 (packet 0013)
- feat: 홈(계산 입력) 화면 조립 `/` (packet 0014)
- feat: 히스토리 목록 화면 `/history` (packet 0016)
- feat: 기록 상세 화면 `/history/:id` (packet 0017)
- feat: 통계 화면 조립 `/stats` (packet 0018)

### Known Issues
- 결과 화면 조립 `/result` (packet 0015) — failed
- 앱 셸 조립 — 라우터 · 전역 Provider · 레이아웃 배선 (packet 0019) — failed
- 검수 정적 검증 + .env.example 문서화 (packet 0020) — failed
