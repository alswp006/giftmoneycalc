# Shared Context (auto-generated — do NOT modify)


## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  lib/
    calc.ts
    constants.ts
  types/
    calc.ts

### Exports (src/lib/)
- calc.ts: export function normalizeCalcInput(partial: Partial<CalcInput> | null | undefined): CalcInput; export function snapToLadder(raw: number): number; export function safeCalculate(partial: Partial<CalcInput>): CalcResult | null
- constants.ts: export const BASE_TABLE: Record<string, Record<string, number>> =; export const LADDER: number[] = [ 10000, 20000, 30000, 40000, 50000, 70000, 80000, 100000, 120000, 150000, 200000, 25000; export const HOTEL_VENUE_BONUS = 30000; export const DEFAULT_INTIMACY = 3; export const DEFAULT_REGION = "metro"; export const DEFAULT_ATTENDANCE = "attend"; export const MIN_INTIMACY = 1; export const MAX_INTIMACY = 5
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-01: 계산 코어 입력 정규화 및 안전 가드 (files: src/lib/calc.ts, src/lib/constants.ts, src/types/calc.ts)

## Available exports from existing files
// src/lib/calc.ts
export function normalizeCalcInput(partial: Partial<CalcInput> | null | undefined): CalcInput {
export function snapToLadder(raw: number): number {
export function safeCalculate(partial: Partial<CalcInput>): CalcResult | null {

// src/lib/constants.ts
export const BASE_TABLE: Record<string, Record<string, number>> = {
export const LADDER: number[] = [
export const HOTEL_VENUE_BONUS = 30000;
export const DEFAULT_INTIMACY = 3;
export const DEFAULT_REGION = "metro";
export const DEFAULT_ATTENDANCE = "attend";
export const MIN_INTIMACY = 1;
export const MAX_INTIMACY = 5;

// src/types/calc.ts
export interface CalcInput {
export interface CalcResult {

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(8)

Key lessons (verify against actual code before applying):
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 라우팅·Provider·전역 레이아웃 같은 단일 통합 배선 책임은 하나의 워크패킷에만 할당하고, 다른 패킷은 그 위에 페이지 내부 요소만 얹도록 경계를 명확히 나눠라. (60% · 타 앱 1회 — 맹신 금지)