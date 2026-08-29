# Shared Context (auto-generated — do NOT modify)


## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AppErrorBoundary.tsx
    BottomCTA.tsx
    Card.tsx
    ChipGroup.tsx
    PageShell.tsx
    ScreenScaffold.tsx
  lib/
    __tests__/
    calc.ts
    constants.ts
    labels.ts
    storage.ts
  main.tsx
  pages/
    HistoryPage.tsx
    Home.tsx
    ResultPage.tsx
  setupTests.ts
  types/
    calc.ts
  vite-env.d.ts

### Exports (src/lib/)
- calc.ts: export function normalizeCalcInput(partial: Partial<CalcInput> | null | undefined): CalcInput; export function snapToLadder(raw: number): number; export function safeCalculate(partial: Partial<CalcInput>): CalcResult | null
- constants.ts: export const BASE_TABLE: Record<string, Record<string, number>> =; export const LADDER: number[] = [ 10000, 20000, 30000, 40000, 50000, 70000, 80000, 100000, 120000, 150000, 200000, 25000; export const HOTEL_VENUE_BONUS = 30000; export const DEFAULT_INTIMACY = 3; export const DEFAULT_REGION = "metro"; export const DEFAULT_ATTENDANCE = "attend"; export const MIN_INTIMACY = 1; export const MAX_INTIMACY = 5
- labels.ts: export const EVENT_LABELS: Record<string, string> =; export const RELATION_LABELS: Record<string, string> =; export const REGION_OPTIONS: Array<; export const ATTENDANCE_OPTIONS: Array<; export const VENUE_OPTIONS: Array<; export const INTIMACY_LABELS: Record<number, string> =; export function formatWon(amount: number): string; export function eventLabel(value?: string): string
- storage.ts: export const HISTORY_STORAGE_KEY = "giftmoney.history"; export function getItem(key: string): string | null; export function setItem(key: string, value: string): void; export function removeItem(key: string): void; export function getHistoryList(): HistoryItem[]; export function addHistoryItem(item: HistoryItem): HistoryItem[]; export function clearHistory(): void

### Components (src/components/)
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- ChipGroup.tsx: ChipGroup
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- heal-1-01: 계산 코어 입력 정규화 및 안전 가드 (files: src/lib/calc.ts, src/lib/constants.ts, src/types/calc.ts)
- heal-1-03: 에러 경로 회귀 테스트 및 전역 에러 바운더리 (files: src/lib/__tests__/calc.error.test.ts, src/components/AppErrorBoundary.tsx, src/App.tsx)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AppErrorBoundary.tsx
export default class AppErrorBoundary extends Component<

// src/components/BottomCTA.tsx
export function SubmitFooter({ label, onClick, disabled = false }: SubmitFooterProps) {
export function ButtonStack({

// src/components/Card.tsx
export default function Card({ children, testId }: CardProps) {

// src/components/ChipGroup.tsx
export default function ChipGroup({ title, options, selected, onSelect }: ChipGroupProps) {

// src/components/PageShell.tsx
export default function PageShell({ children, bottomInset = 0 }: PageShellProps) {

// src/components/ScreenScaffold.tsx
export default function ScreenScaffold({ top, bottom, children }: ScreenScaffoldProps) {

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

// src/lib/labels.ts
export const EVENT_LABELS: Record<string, string> = {
export const RELATION_LABELS: Record<string, string> = {
export const REGION_OPTIONS: Array<{ value: string; label: string }> = [
export const ATTENDANCE_OPTIONS: Array<{ value: string; label: string }> = [
export const VENUE_OPTIONS: Array<{ value: string; label: string }> = [
export const INTIMACY_LABELS: Record<number, string> = {
export function formatWon(amount: number): string {
export function eventLabel(value?: string): string {
export function relationLabel(value?: string): string {

// src/types/calc.ts
export interface CalcInput {
export interface CalcResul

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(8)

Key lessons (verify against actual code before applying):
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 라우팅·Provider·전역 레이아웃 같은 단일 통합 배선 책임은 하나의 워크패킷에만 할당하고, 다른 패킷은 그 위에 페이지 내부 요소만 얹도록 경계를 명확히 나눠라. (60% · 타 앱 1회 — 맹신 금지)