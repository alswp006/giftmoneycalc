# TASK — GiftMoneyCalc

> SPEC 총 55개 AC를 **27개 패킷**으로 분해. 순서: 타입 → 데이터/로직 → 공용 컴포넌트 → 페이지 → 통합.
> **파일 소유권 원칙:** 모든 파일은 **정확히 1개 태스크만** 생성·수정한다. 한 페이지에 기능이 많은 경우 페이지 파일을 쪼개는 대신 **표시 컴포넌트/훅을 별도 파일로 분리**해 각각 독립 패킷으로 만들었다. 페이지 파일(`src/pages/*.tsx`)은 언제나 단일 태스크 소유.
> 모든 패킷 완료 시점에 `tsc --noEmit` + `vite build`가 통과해야 한다.
>
> **v2 변경 이력(교차검증 반영):** 통계 화면의 기록 건수 경계(0건 / 1~2건 / 3건 이상)가 SPEC F5-AC5와 Task 3.13 DoD 사이에서 1~2건 구간이 미정의였다. → **Task 3.13 DoD를 `records.length < MIN_STATS_RECORDS`(=3) 기준으로 재정의**하고, **Task 3.12 `useStatsUnlock`에 `records.length` 무관 원칙**을 명시했다. 상수 `MIN_STATS_RECORDS`는 이미 Task 1.2가 소유하므로 파일 소유권 변동 없음(27개 패킷 유지).

---

## Epic 1. Types & Constants

**Risk Assessment**
- **Complexity:** Low
- **Risk factors:** RouteState가 누락되면 `/result`·`/record/new`·`/share`가 새로고침·딥링크 진입 시 런타임 크래시(2026-08-03 SplitMate 완주율 0% 사고 유형). 계수 상수를 페이지마다 중복 정의하면 값 변경 시 화면 간 수치 불일치 발생.
- **Mitigation:** 타입/상수를 최우선 패킷으로 고정해 이후 모든 패킷이 단일 소스를 import하도록 강제. RouteState 정의를 Task 1.1 DoD에 문자열 수준으로 명시.

### Task 1.1 도메인 타입 + RouteState 정의
- **Description:** SPEC "TypeScript 인터페이스"의 모든 타입과, 페이지 간 라우터 state 계약인 `RouteState`를 순수 타입 파일로 작성한다. 런타임 코드 0줄.
- **DoD:**
  - `src/lib/types.ts`에 `EventType`, `RelationType`, `RegionType`, `Attendance`, `Intimacy`, `Direction`, `CalcInput`, `BreakdownItem`, `CalcResult`, `GiftRecord`, `Settings`, `LastCalc`, `RewardUnlock`이 SPEC과 필드명·타입 100% 동일하게 export됨.
  - `export type WriteResult = { ok: true } | { ok: false; reason: 'QUOTA_EXCEEDED' | 'LIMIT_REACHED' | 'PARSE_ERROR' }` 존재.
  - `RouteState`가 아래와 정확히 동일하게 존재:
    ```ts
    export type RouteState = {
      '/calc': { eventType: EventType } | null;
      '/result': { input: CalcInput } | null;
      '/record/new': { prefill: { eventType: EventType; relation: RelationType; amount: number } } | null;
      '/share': { result: CalcResult } | null;
      '/history': null;
      '/stats': null;
      '/settings': null;
    };
    ```
  - 파일 내 `function`/런타임 `const` 값 선언 0개(타입·인터페이스만).
  - `tsc --noEmit` 통과.
- **Covers:** [F1-AC4(GiftRecord 형태), F3-AC6(RouteState 계약), F6-AC6(RouteState 계약)]
- **Files:** `src/lib/types.ts`
- **Depends on:** none

### Task 1.2 계산·스토리지 상수 테이블
- **Description:** 계수 테이블·금액 사다리·라벨 맵·localStorage 키·기본값·상한치를 한 파일로 분리한다(Assumption 2: 값 변경은 1곳 수정).
- **DoD:**
  - `src/lib/constants.ts`에 `EVENT_BASE: Record<EventType, number>` = wedding 50000 / funeral 50000 / firstBirthday 30000 / opening 50000.
  - `RELATION_FACTOR` = family 3.0, closeFriend 2.0, friend 1.0, coworker 1.0, boss 1.0, acquaintance 0.6.
  - `INTIMACY_FACTOR` = {1:0.8, 2:0.9, 3:1.0, 4:1.2, 5:1.4}, `ATTENDANCE_FACTOR` = {attending:1.6, absent:1.0}, `REGION_FACTOR` = {seoulGangnam:1.2, metropolitan:1.1, majorCity:1.0, other:0.9}.
  - `AMOUNT_LADDER = [30000,50000,70000,100000,150000,200000,300000,500000,1000000] as const`.
  - 라벨 맵 `EVENT_LABEL`/`RELATION_LABEL`/`INTIMACY_LABEL`/`ATTENDANCE_LABEL`/`REGION_LABEL`이 SPEC 표 한글 라벨과 문자 단위 일치(`metropolitan` → `'서울(그 외)·수도권'`), breakdown 표기용 `REGION_SHORT_LABEL.metropolitan === '서울·수도권'` 별도 존재.
  - `STORAGE_KEYS = { records:'gmc:records:v1', settings:'gmc:settings:v1', lastCalc:'gmc:lastCalc:v1', rewardUnlock:'gmc:rewardUnlock:v1' }`.
  - `DEFAULT_SETTINGS = { defaultRegion:'majorCity', onboardingDone:false, compactList:false }`, `DEFAULT_REWARD_UNLOCK = { statsUnlockedUntil: 0 }`, `RECORD_LIMIT = 1000`, `REWARD_UNLOCK_MS = 86400000`, `HISTORY_PAGE_SIZE = 20`, `MIN_STATS_RECORDS = 3`.
  - **`MIN_STATS_RECORDS`는 통계 게이트의 유일한 판정 기준 상수이며, Task 3.13은 리터럴 `3` 대신 이 상수를 import해 사용한다(하드코딩 0건).**
  - 파일 내 HEX 색상 리터럴 0개. `tsc --noEmit` 통과.
- **Covers:** [F1-AC1, F1-AC2, F1-AC3, F1-AC7, F5-AC5(임계값 상수)]
- **Files:** `src/lib/constants.ts`
- **Depends on:** Task 1.1

---

## Epic 2. Data & Logic Layer

**Risk Assessment**
- **Complexity:** Medium
- **Risk factors:** (1) 사다리 스냅 동률 처리 오류로 AC 수치 불일치. (2) `JSON.parse` 실패나 `QuotaExceededError`가 throw로 새어 나가면 흰 화면. (3) 1,000건 상한 미강제 시 5MB 초과. (4) 통계 집계·캔버스 렌더를 페이지 안에 넣으면 패킷이 10분 초과.
- **Mitigation:** 순수 계산(2.1)/영속화(2.2)/React 상태(2.3)/캔버스(2.4)/집계(2.5)/입력 검증(2.6)을 파일 단위로 완전 분리. 모든 쓰기는 `WriteResult` 반환으로 통일해 예외 전파 경로를 원천 차단. UI 패킷은 전부 이 레이어 완료 후 시작.

### Task 2.1 계산 엔진 `calcGiftAmount()` + 금액 포맷터
- **Description:** `CalcInput` → `CalcResult` 순수 함수와 원화 포맷 유틸을 구현한다. 부작용·스토리지 접근 없음.
- **DoD:**
  - `src/lib/calc.ts`가 `calcGiftAmount(input: CalcInput): CalcResult`를 export.
  - `rawAmount = Math.round(base × relationFactor × intimacyFactor × attendanceFactor × regionFactor)`.
  - `recommended` = `AMOUNT_LADDER` 중 `|ladder[i]-rawAmount|` 최소값, 동률 시 **더 작은 값**. `min = ladder[Math.max(0,i-1)]`, `max = ladder[Math.min(8,i+1)]`.
  - `breakdown` 길이 정확히 5, 순서 = [기본 금액, 관계, 친밀도, 참석, 지역], label 형식 = `기본 금액 50,000원` / `관계: 친한 친구` / `친밀도: 자주 만남` / `참석: 참석` / `지역: 서울·수도권`.
  - `src/lib/format.ts`의 `formatKRW(200000) === '200,000원'`(`toLocaleString('ko-KR')` 사용, `Intl.Segmenter` 미사용).
  - 테스트 3케이스 정확 통과: `{wedding,coworker,3,absent,majorCity}` → 50000/50000/30000/70000, breakdown.length 5 · `{wedding,closeFriend,4,attending,metropolitan}` → 211200/200000/150000/300000 · `{firstBirthday,acquaintance,1,absent,other}` → 12960/30000/30000/50000.
  - `console.error` 호출 0개.
- **Covers:** [F1-AC1, F1-AC2, F1-AC3]
- **Files:** `src/lib/calc.ts`, `src/lib/format.ts`, `src/lib/__tests__/calc.test.ts`
- **Depends on:** Task 1.2

### Task 2.2 localStorage 래퍼 (`storage.ts`)
- **Description:** 4개 키에 대한 타입 안전 read/write 래퍼. 파싱 실패·용량 초과·상한 초과를 모두 반환값으로 표현하고 예외를 던지지 않는다.
- **DoD:**
  - `src/lib/storage.ts`가 export: `getRecords()`, `addRecord(input)`, `deleteRecord(id)`, `getSettings()`, `saveSettings(patch)`, `getLastCalc()`, `saveLastCalc(v)`, `getRewardUnlock()`, `saveRewardUnlock(untilMs)`, `clearAllData()`.
  - `addRecord`는 `id = crypto.randomUUID()`(36자), `createdAt = Date.now()`(정수) 부여 후 `WriteResult` 반환. 성공 시 `getRecords().length` 1 증가.
  - 손상 JSON(`'{{{not-json'`) 상태에서 `getRecords()` → `[]` 반환 + 해당 키 `'[]'` 복구 저장 + `console.error` 미호출. settings/lastCalc/rewardUnlock도 동일 규칙으로 각 기본값 폴백.
  - `setItem`이 `QuotaExceededError`를 throw하는 환경에서 `addRecord` → `{ ok:false, reason:'QUOTA_EXCEEDED' }`, 예외 미전파.
  - 기존 1,000건 상태에서 `addRecord` → `{ ok:false, reason:'LIMIT_REACHED' }` + 저장 건수 1,000 유지.
  - `clearAllData()` → records `[]`, lastCalc `null`, rewardUnlock `{statsUnlockedUntil:0}` 재설정, settings는 보존.
  - 모든 `setItem`이 단일 `safeSet()` 헬퍼 경유(try/catch 1곳).
- **Covers:** [F1-AC4, F1-AC5, F1-AC6, F1-AC7, F7-AC5(초기화 로직)]
- **Files:** `src/lib/storage.ts`, `src/lib/__tests__/storage.test.ts`
- **Depends on:** Task 1.2

### Task 2.3 전역 스토리지 상태 (`StorageProvider` + `useStorage`)
- **Description:** 앱 마운트 시 localStorage를 1회 읽어 Context로 배포하고, 변경 시 storage 래퍼 호출 후 메모리 상태를 동기화하는 경량 스토어.
- **DoD:**
  - `src/store/StorageProvider.tsx`가 `StorageProvider`와 `useStorage()`를 export.
  - `useStorage()` 반환: `{ ready, records, settings, lastCalc, rewardUnlock, addRecord, deleteRecord, updateSettings, setLastCalc, unlockStats, clearAll, loadError }`.
  - 초기화 완료 전 `ready === false`이며 이때 `records = []`, `settings = DEFAULT_SETTINGS`, `lastCalc = null`, `rewardUnlock = DEFAULT_REWARD_UNLOCK` 반환(undefined 반환 금지).
  - 초기 로드 파싱 실패 시 `loadError === true` + 기본값 렌더(예외 미전파, `console.error` 0개).
  - `addRecord`/`deleteRecord`/`updateSettings` 성공 시 상태 즉시 갱신(재조회 불필요), 실패 시 `WriteResult`를 그대로 반환.
  - `unlockStats()`는 `Date.now() + REWARD_UNLOCK_MS`를 저장하고 상태 반영.
  - `src/main.tsx`에서 앱 루트를 `StorageProvider`로 감쌈. 빌드 통과.
- **Covers:** [F1-AC8]
- **Files:** `src/store/StorageProvider.tsx`, `src/main.tsx`
- **Depends on:** Task 2.2

### Task 2.4 공유 카드 Canvas 렌더러 + 공유 문구 빌더
- **Description:** `CalcResult`를 1080×1080 캔버스에 그리는 순수 렌더 함수와 복사 문구 생성 함수를 UI와 분리해 구현한다.
- **DoD:**
  - `src/lib/shareCard.ts`가 `drawShareCard(canvas: HTMLCanvasElement, result: CalcResult): void`와 `buildShareText(result: CalcResult): string`을 export.
  - 호출 후 `canvas.width === 1080 && canvas.height === 1080`.
  - 캔버스에 `formatKRW(recommended)`(예: `200,000원`), 조건 요약(`결혼식 · 친한 친구 · 참석`), 앱 이름(`축의금 계산기`) 3개 텍스트가 `fillText`로 그려짐. `personName` 등 개인 이름 필드 참조 0개.
  - 색상은 `getComputedStyle(document.documentElement).getPropertyValue('--tds-color-background' | '--tds-color-grey900' …)`에서 읽어 사용, 파일 내 `#[0-9a-fA-F]{3,8}\b` 매치 0건. 변수 값이 빈 문자열이면 `var(--tds-color-*)` 문자열을 그대로 `fillStyle`에 대입하는 폴백 경로 존재(예외 없음).
  - `buildShareText`가 정확히 `결혼식 · 친한 친구 · 참석 기준 적정 축의금은 200,000원이에요 (적정 범위 150,000원~300,000원)` 형식 반환.
  - `structuredClone`, `Object.groupBy`, `findLast` 미사용.
- **Covers:** [F6-AC1, F6-AC3(문구 생성), F6-AC8]
- **Files:** `src/lib/shareCard.ts`
- **Depends on:** Task 2.1

### Task 2.5 통계 집계 유틸 (`stats.ts`)
- **Description:** `GiftRecord[]`를 받아 통계 화면 지표를 계산하는 순수 함수.
- **DoD:**
  - `src/lib/stats.ts`가 `aggregate(records: GiftRecord[], nowMs: number)`를 export하고 `{ count, givenTotal, receivedTotal, givenAverage, monthly: { ym: string; total: number }[], byType: { eventType: EventType; count: number; ratio: number }[] }` 반환.
  - `givenAverage`는 `direction === 'given'` 기록만 대상, `Math.round` 정수, given 0건이면 `0`.
  - 입력 `[{given,wedding,100000},{given,wedding,50000},{received,wedding,200000}]` → `givenAverage === 75000`, `givenTotal === 150000`, `receivedTotal === 200000`, `count === 3`.
  - `monthly` 길이 정확히 12, `nowMs` 기준 과거 12개월 오름차순 `YYYY-MM`, 기록 없는 달은 `total: 0`.
  - `byType`은 건수>0인 유형만 포함, `ratio = count/전체건수`(0~1).
  - **경계 테스트: 입력 길이 1건·2건에서도 예외 없이 `count === 1|2`, `monthly.length === 12`, `byType.length >= 1`을 반환한다(게이트 미달 구간에서도 무료 요약 Card가 이 값을 사용).**
  - `Object.groupBy` 미사용, `console.error` 0개, 빈 배열 입력 시 예외 없이 0/빈 배열 반환.
- **Covers:** [F5-AC3(집계 산출)]
- **Files:** `src/lib/stats.ts`, `src/lib/__tests__/stats.test.ts`
- **Depends on:** Task 1.2

### Task 2.6 런타임 가드 + 폼 검증 규칙
- **Description:** 라우터 state 유효성 가드와 기록 폼 검증 규칙을 페이지와 분리된 순수 모듈로 구현한다.
- **DoD:**
  - `src/lib/guards.ts`에 `isValidCalcInput(v: unknown): v is CalcInput`, `isValidCalcResult(v: unknown): v is CalcResult`, `isValidPrefill(v: unknown)` export. 각 함수는 `null`/`undefined`/필드 누락/열거값 밖(`eventType:'unknown'`)에 대해 예외 없이 `false` 반환.
  - `src/lib/validation.ts`에 `validateRecordForm(form)`이 필드별 에러 맵 반환. 규칙: 이름 1~20자, 금액 1,000~10,000,000 & 1,000원 단위, 날짜 `/^\d{4}-\d{2}-\d{2}$/`, 메모 0~50자.
  - 에러 문자열이 정확히 `이름을 입력해주세요`, `금액은 1,000원 이상 1,000원 단위로 입력해주세요`, `날짜를 선택해주세요`, `메모는 50자 이내로 입력해주세요`.
  - 테스트: `amount:500` → 금액 에러, `amount:12500` → 동일 금액 에러, `amount:100000` → 에러 없음. `isValidCalcInput({eventType:'unknown'}) === false`.
  - `console.error` 0개.
- **Covers:** [F3-AC7(가드), F4-AC2(규칙), F4-AC3(규칙)]
- **Files:** `src/lib/guards.ts`, `src/lib/validation.ts`, `src/lib/__tests__/validation.test.ts`
- **Depends on:** Task 1.2

---

## Epic 3. Core UI — 공용 컴포넌트 & 페이지

**Risk Assessment**
- **Complexity:** High
- **Risk factors:** (1) `location.state`를 null 확인 없이 캐스팅하면 새로고침·딥링크 진입 시 즉시 크래시(완주율 0% 사고). (2) TDS 컴포넌트에 Tailwind/인라인 padding 덮어쓰기 → 검수 반려. (3) 한 페이지에 폼+검증+저장+목록을 몰아넣으면 10분 초과. (4) 동일 페이지 파일을 여러 패킷이 수정하면 충돌·덮어쓰기 발생. (5) **건수 경계(0 / 1~2 / 3+)가 화면마다 다르게 해석되면 게이트가 열리거나 빈 리포트가 노출됨.**
- **Mitigation:** **페이지 파일은 태스크 1개만 소유**하고, 무거운 부분(표시 컴포넌트·훅)은 별도 파일 패킷으로 선행 구현해 페이지 패킷을 조립 수준으로 축소. 공용 컴포넌트(SubmitFooter/CountUp/ChipGroup)는 최초 1개 패킷에서만 생성. state를 받는 모든 페이지 DoD에 "state 없이 직접 진입해도 크래시 없음" 항목 필수 포함. 여백은 TDS `Spacing`만 사용. **건수 경계는 `MIN_STATS_RECORDS` 단일 상수 비교(`records.length < MIN_STATS_RECORDS`)로만 판정하고, 0건/1~2건/3건 이상 3구간을 Task 3.13 DoD에 각각 명시한다.**

### Task 3.1 공용 UI 컴포넌트 (SubmitFooter · CountUp · SummaryHero)
- **Description:** 여러 화면이 공유하는 하단 고정 액션 영역, 숫자 CountUp, 히어로 블록을 한 번만 만든다. 이후 어떤 페이지 패킷도 이 파일들을 수정하지 않는다.
- **DoD:**
  - `src/components/SubmitFooter.tsx`: children을 하단 고정 영역에 렌더. `env(safe-area-inset-bottom)` 반영, `visualViewport` resize 리스너로 키보드 노출 시 키보드 위로 이동, 언마운트 시 리스너 해제. 내부에 TDS Button을 `display="block" size="large"`로 감싸는 레이아웃(높이 ≥ 48px 보장), 커스텀 CSS는 flex 배치에만 사용.
  - `src/components/CountUp.tsx`: `value: number`, `durationMs = 600`을 받아 `formatKRW` 결과를 애니메이션. **마운트 첫 프레임부터 항상 숫자 텍스트를 포함**하며 어떤 프레임에서도 빈 문자열이 되지 않고, 종료 시 정확히 최종값 표시. `prefers-reduced-motion` 시 즉시 최종값.
  - `src/components/SummaryHero.tsx`: `data-testid`를 prop으로 받아 루트에 부여, 값 타이포 `t2` 이상, 부제/배지 슬롯 제공. TDS Paragraph.Text 사용, HEX 0개.
  - 세 파일 모두 인라인/Tailwind padding·margin 0개(간격은 TDS `Spacing size={...}`).
- **Covers:** [F3-AC8]
- **Files:** `src/components/SubmitFooter.tsx`, `src/components/CountUp.tsx`, `src/components/SummaryHero.tsx`
- **Depends on:** Task 2.1

### Task 3.2 ChipGroup 컴포넌트 + 선택지 옵션 테이블
- **Description:** 유형/관계/친밀도/참석/지역/방향 선택에 공통으로 쓰이는 Chip 그룹 컴포넌트와 옵션 배열을 만든다.
- **DoD:**
  - `src/components/ChipGroup.tsx`: props `{ testId, label, options, value, onChange }`. 루트에 `data-testid={testId}`, 위에 TDS `Paragraph.Text` 라벨 렌더.
  - 각 Chip은 선택 시 `aria-pressed="true"`, 미선택 시 `"false"`. Chip 래퍼가 `min-height: 44px`, Chip 간 gap 8px(커스텀 flex CSS만 허용, TDS Chip 자체 padding 덮어쓰기 0건).
  - `src/lib/options.ts`가 `EVENT_OPTIONS`, `RELATION_OPTIONS`, `INTIMACY_OPTIONS`, `ATTENDANCE_OPTIONS`, `REGION_OPTIONS`, `DIRECTION_OPTIONS`를 `{ value, label }[]`로 export하고 label은 `constants.ts` 라벨 맵에서 파생(하드코딩 중복 0건).
  - HEX 리터럴 0개, `console.error` 0개.
- **Covers:** [F2-AC4(터치 타겟)]
- **Files:** `src/components/ChipGroup.tsx`, `src/lib/options.ts`
- **Depends on:** Task 1.2

### Task 3.3 `/calc` 페이지 (선택 폼 + 프리필 + 계산 실행)
- **Description:** ChipGroup 5개로 구성된 단일 스크롤 폼과 SubmitFooter 제출 플로우를 한 파일에서 완성한다.
- **DoD:**
  - `src/pages/CalcPage.tsx` 루트가 `ScreenScaffold`(raw `div` 골격 0개), Top(뒤로가기) 포함. 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - `data-testid`가 `group-eventType`, `group-relation`, `group-intimacy`, `group-attendance`, `group-region` 5개 존재(모두 `ChipGroup` 사용).
  - `const nav = (useLocation().state as RouteState['/calc']) ?? null;` 패턴 사용. 구조 분해 캐스팅 0건. `nav === null`이면 예외 없이 전체 미선택 빈 폼 렌더(유형 Chip 전부 `aria-pressed="false"`). `nav.eventType`이 있으면 해당 유형 Chip 선택 상태(홈에서 `장례식` 진입 시 `장례식` 선택).
  - `settings.defaultRegion === 'seoulGangnam'`이면 `서울 강남권` Chip이 `aria-pressed="true"`.
  - `ready === false`인 동안 지역 그룹 자리에 TDS Skeleton, 제출 버튼 `disabled={true}`.
  - SubmitFooter 안 TDS Button(`display="block" size="large"`, 라벨 `적정 금액 계산하기`, 높이 ≥ 48px). 유형·관계·친밀도·참석 중 하나라도 미선택이면 `disabled={true}`이고 탭해도 `navigate` 호출 0회.
  - 탭 시 `calcGiftAmount(input)` → `setLastCalc({ input, result, at: Date.now() })`로 `gmc:lastCalc:v1` 저장 → `navigate('/result', { state: { input } })`.
  - `isSubmitting === true` 동안 버튼 `disabled`, 300ms 내 5회 연속 탭해도 `navigate` 총 1회.
  - 텍스트 입력 필드 0개(키보드 미노출), 이 화면에서 FloatingTabBar 미렌더, `AdSlot` 0개, `console.error`/`window.open`/`window.location.href` 0개.
- **Covers:** [F2-AC1, F2-AC2, F2-AC3, F2-AC5, F2-AC6, F2-AC7, F7-AC1(수신 측)]
- **Files:** `src/pages/CalcPage.tsx`
- **Depends on:** Task 3.1, Task 3.2, Task 2.3, Task 2.1

### Task 3.4 결과 표시 컴포넌트 (`ResultContent`)
- **Description:** `CalcResult`만 props로 받는 순수 표시 컴포넌트를 만든다. 라우팅·스토리지 접근 0건이라 페이지 패킷과 파일이 완전히 분리된다.
- **DoD:**
  - `src/components/result/ResultContent.tsx`가 `{ result: CalcResult }`를 받아 DOM 순서 = `data-testid="recommend-hero"` → `data-testid="range-card"` → `data-testid="breakdown-card"` → 고지 Paragraph.Text로 렌더.
  - `recommend-hero`는 `SummaryHero` + `CountUp`(600ms)으로 최종 텍스트 `200,000원` 표시(입력 `{wedding,closeFriend,4,attending,metropolitan}` 기준), 타이포 `t2` 이상, 조건 요약 TDS Chip 배지 포함.
  - CountUp 진행 중 어떤 프레임에서도 `recommend-hero`의 textContent가 빈 문자열이 아니며 항상 숫자 포함.
  - `range-card`(Card)에 텍스트 `150,000원 ~ 300,000원`.
  - `breakdown-card`(Card) 내부에 TDS ListRow 정확히 5개, 각각 `기본 금액 50,000원`, `관계: 친한 친구 ×2.0`, `친밀도: 자주 만남 ×1.2`, `참석: 참석 ×1.6`, `지역: 서울·수도권 ×1.1` 포함.
  - 하단에 정확히 `관례 기준 참고값입니다. 실제 금액은 개인 상황에 따라 달라질 수 있어요.` 문구를 Paragraph.Text로 표시. AI 고지 문구 0개.
  - HEX 0개, TDS 컴포넌트에 인라인/Tailwind padding·margin 0개.
- **Covers:** [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC8]
- **Files:** `src/components/result/ResultContent.tsx`
- **Depends on:** Task 3.1, Task 2.1

### Task 3.5 `/result` 페이지 (state 가드 + 액션 분기)
- **Description:** state 수신·검증·폴백·리다이렉트와 하단 2개 액션을 담당하는 컨테이너. 표시는 `ResultContent`에 위임한다.
- **DoD:**
  - `src/pages/ResultPage.tsx` 루트가 `ScreenScaffold`, 순서 = Top → `<ResultContent result={...} />` → SubmitFooter. 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - `const st = (useLocation().state as RouteState['/result']) ?? null;`로 읽고, `const { input } = useLocation().state as X` 형태 구조 분해 캐스팅 0건.
  - `st === null`이면 `getLastCalc()` 폴백, 그것도 `null`이면 결과 UI 렌더 없이 `navigate('/calc', { replace: true })`.
  - `isValidCalcInput`이 `false`인 경우(예: `{ input: { eventType:'unknown' } }`) → Toast `계산 정보를 불러오지 못했어요` 후 `navigate('/calc', { replace: true })`, `console.error` 0개.
  - SubmitFooter 주 버튼 `이 금액으로 기록 저장`(48px) → `navigate('/record/new', { state: { prefill: { eventType, relation, amount: result.recommended } } })`.
  - 보조 버튼 `공유 카드 만들기`(48px) → `navigate('/share', { state: { result } })`.
  - `/result`를 주소창 직접 입력·새로고침으로 진입해도 흰 화면·크래시 없이 폴백 또는 `/calc` 이동으로 처리됨.
  - `AdSlot` 0개, FloatingTabBar 미렌더.
- **Covers:** [F3-AC1(진입 경로), F3-AC5, F3-AC6, F3-AC7]
- **Files:** `src/pages/ResultPage.tsx`
- **Depends on:** Task 3.4, Task 2.6, Task 2.3

### Task 3.6 기록 폼 컴포넌트 (`RecordForm`)
- **Description:** 이름/금액/메모 TextField, 유형·관계·방향 ChipGroup, 날짜 ListRow+BottomSheet로 구성된 제어 컴포넌트. 저장·라우팅 로직 없음.
- **DoD:**
  - `src/components/record/RecordForm.tsx`가 `{ value, onChange, errors }`를 받는 제어 컴포넌트로 export.
  - TextField 3개(이름/금액/메모), ChipGroup 3개(유형/관계/방향), 날짜 ListRow(탭 시 TDS BottomSheet 열림, 선택 시 `YYYY-MM-DD` 반영) 존재.
  - 금액 필드 `inputMode="numeric"` + 표시값 천 단위 콤마(`200000` → `200,000`), 메모 필드 `enterKeyHint="done"` + 50자 입력 제한.
  - `errors.personName`이 있으면 이름 TextField 하단에 해당 문자열 표시(금액·날짜·메모도 동일 규칙).
  - `autoFocusName` prop이 `true`면 이름 TextField에 자동 포커스.
  - TextField 렌더 높이 ≥ 48px, ListRow ≥ 56px, Chip ≥ 44px. TDS 컴포넌트에 인라인/Tailwind padding·margin 0개.
- **Covers:** [F4-AC4(표시 계층)]
- **Files:** `src/components/record/RecordForm.tsx`
- **Depends on:** Task 3.2, Task 2.1

### Task 3.7 `/record/new` 페이지 (프리필 + 검증 + 저장)
- **Description:** 폼 상태·프리필·검증·저장·실패 안내를 담당하는 컨테이너.
- **DoD:**
  - `src/pages/RecordNewPage.tsx` 루트 `ScreenScaffold` + Top + `<RecordForm />` + `SubmitFooter`(버튼 `저장`, display="block"). 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - `const st = (useLocation().state as RouteState['/record/new']) ?? null;` 패턴 사용. `st === null`이어도 크래시 없이 빈 폼 렌더(금액 빈 값, 날짜 오늘 `YYYY-MM-DD`, 방향 `given` 기본 선택).
  - prefill 진입 시(`isValidPrefill` 통과): 금액 표시값 `200,000`, 유형 Chip `결혼식` 선택, 관계 Chip `친한 친구` 선택, 이름 TextField 빈 값 + 자동 포커스. prefill이 손상되면 빈 폼으로 폴백(예외 0건).
  - 이름 빈 값 제출 → 이름 필드 하단에 `이름을 입력해주세요` 표시, localStorage 쓰기 0회.
  - `amount:500` 제출 → `금액은 1,000원 이상 1,000원 단위로 입력해주세요` 표시, 같은 화면에서 `amount:12500` 재제출 시에도 동일 메시지.
  - 유효 입력(`{김토스,100000,2026-09-12,given,wedding,friend,'대학 동기'}`) 제출 → `gmc:records:v1` 1건 저장 → Toast `기록을 저장했어요` → `navigate('/history', { replace: true })`.
  - 저장 중 버튼 `loading` + `disabled`, 중복 제출 시 저장 1회만 발생.
  - `addRecord`가 `{ok:false,reason:'QUOTA_EXCEEDED'}` 또는 `'LIMIT_REACHED'` 반환 시 TDS AlertDialog `저장 공간이 부족해요. 오래된 기록을 삭제해주세요` 표시 + 화면 이동 0회.
  - `console.error` 0개, `AdSlot` 0개, FloatingTabBar 미렌더.
- **Covers:** [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC8]
- **Files:** `src/pages/RecordNewPage.tsx`
- **Depends on:** Task 3.6, Task 2.6, Task 2.3, Task 3.1

### Task 3.8 기록 목록 컴포넌트 + 무한 스크롤 훅
- **Description:** 정렬·페이지네이션·항목 렌더를 담당하는 표시 계층과 IntersectionObserver 훅.
- **DoD:**
  - `src/hooks/useInfiniteList.ts`가 `useInfiniteList(items, pageSize)` → `{ visible, sentinelRef, hasMore }` 반환. 센티넬 교차 시 `pageSize`만큼 증가, 끝 도달 시 `unobserve` 후 추가 증가 0회, `items` 변경 시 카운트를 `pageSize`로 리셋. 언마운트 시 observer disconnect.
  - `src/components/history/RecordList.tsx`가 `{ records, compact, onSelect }`를 받아 `createdAt` 내림차순 정렬 후 TDS ListRow 렌더(높이 ≥ 64px), 마지막에 센티넬 요소 렌더.
  - 45건 전달 시 초기 ListRow 정확히 20개 → 센티넬 도달 시 40개 → 한 번 더 45개 → 이후 추가 0개.
  - `compact === true`면 보조 텍스트(메모/유형) 숨김.
  - 각 ListRow에 금액(`formatKRW`)·이름·날짜·방향 배지 표시. HEX 0개, `Array.prototype.findLast`/`Object.groupBy` 미사용.
- **Covers:** [F4-AC6]
- **Files:** `src/components/history/RecordList.tsx`, `src/hooks/useInfiniteList.ts`
- **Depends on:** Task 2.1, Task 1.2

### Task 3.9 기록 액션 시트 (BottomSheet + 삭제 확인)
- **Description:** 항목 탭 시 열리는 액션 시트와 삭제 확인 다이얼로그를 독립 컴포넌트로 구현한다.
- **DoD:**
  - `src/components/history/RecordActionSheet.tsx`가 `{ record, open, onClose, onDelete }`를 받아 TDS BottomSheet를 렌더하고 `삭제` 항목 포함.
  - `삭제` 탭 → TDS AlertDialog(확인/취소) 표시. `취소` 선택 시 `onDelete` 호출 0회, 시트 닫힘.
  - `삭제` 확인 → `onDelete(record.id)` 정확히 1회 호출 후 시트·다이얼로그 모두 닫힘.
  - `record === null`이어도 예외 없이 아무것도 렌더하지 않음.
  - 터치 대상 44×44px 이상, `console.error` 0개, TDS 컴포넌트 padding 덮어쓰기 0건.
- **Covers:** [F4-AC7(UI 흐름)]
- **Files:** `src/components/history/RecordActionSheet.tsx`
- **Depends on:** Task 1.1

### Task 3.10 `/history` 페이지 (탭 필터 + 빈 상태 + 삭제 wiring + 배너)
- **Description:** 목록·액션 시트를 조립하고 필터 Tab, 빈 상태, 로딩, AdSlot 배치를 완성한다.
- **DoD:**
  - `src/pages/HistoryPage.tsx` 루트 `ScreenScaffold` + Top(우측 `추가` 액션 44×44px 이상, 탭 시 `navigate('/record/new', { state: null })`) + FloatingTabBar. 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - TDS Tab(전체/줌/받음) 전환 시 `direction` 필터 적용되고 페이지네이션 카운트가 20으로 리셋.
  - `records`가 `[]`이면 `data-testid="history-empty"`에 `Asset.ContentIcon` + `아직 기록이 없어요` + `첫 기록 추가하기` TDS Button(`display="block"`) 렌더, 목록·센티넬 미렌더.
  - `ready === false`이면 ListRow Skeleton 5행.
  - ListRow 탭 → `RecordActionSheet` 오픈 → 삭제 확인 시 `deleteRecord(id)` 호출로 `gmc:records:v1`에서 해당 `id` 제거, 목록에서 즉시 제거, Toast `기록을 삭제했어요`. 실패(`ok:false`) 시 Toast `삭제하지 못했어요. 다시 시도해주세요` + 목록 상태 유지.
  - `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`가 이 화면에 **정확히 1개**, 목록 마지막 ListRow(빈 상태에서는 `history-empty`)의 **다음 형제 노드**로 렌더. 무한 스크롤로 항목이 늘어나도 항상 목록 끝 뒤 1개 유지.
  - AdSlot 래퍼에 `position: fixed`/`z-index` 오버레이 스타일 0개, FloatingTabBar를 가리지 않음. `AdSlot` 내부 구현 수정 0건.
  - `location.state` 참조 0개. `/history` 직접 진입해도 크래시 0건, `console.error` 0개.
- **Covers:** [F4-AC5, F4-AC6, F4-AC7, F7-AC6(히스토리 배너)]
- **Files:** `src/pages/HistoryPage.tsx`
- **Depends on:** Task 3.8, Task 3.9, Task 2.3

### Task 3.11 통계 시각화 컴포넌트 (StatsDetail · Sparkline · MiniBar)
- **Description:** 해제된 상세 리포트 영역을 순수 표시 컴포넌트로 구현한다(집계 결과를 props로 수신).
- **DoD:**
  - `src/components/stats/StatsDetail.tsx`가 `{ agg }`(Task 2.5 `aggregate` 결과)를 받아 루트에 `data-testid="stats-detail"` 부여.
  - 내부에 `SummaryHero`(평균 금액, CountUp) 1개, `data-testid="trend-sparkline"` 1개, `data-testid="type-minibar"` 1개가 각각 Card로 묶여 존재.
  - `data-testid="stat-average"` = `75,000원`, `data-testid="stat-given-total"` = `150,000원`, `data-testid="stat-received-total"` = `200,000원`(F5-AC3 입력 기준).
  - `src/components/stats/Sparkline.tsx`는 `monthly` 12포인트를 SVG로 렌더하며 전 구간 0일 때도 예외 없이 평평한 선 표시.
  - `src/components/stats/MiniBar.tsx`는 `byType.ratio`를 폭 비율로 표현하고 유형별 건수 TDS ListRow를 함께 표시.
  - 세 파일 모두 색상은 `var(--tds-color-*)`만 사용, `#[0-9a-fA-F]{3,8}\b` 매치 0건. 다크모드에서 그래프·텍스트가 배경과 동일 색으로 사라지지 않음.
  - **`agg.count < 3`인 값이 전달되어도 예외 없이 렌더된다(건수 게이트 판정은 이 컴포넌트가 아닌 Task 3.13 페이지 책임 — 컴포넌트 내부에 건수 분기 0건).**
- **Covers:** [F5-AC3, F5-AC4]
- **Files:** `src/components/stats/StatsDetail.tsx`, `src/components/stats/Sparkline.tsx`, `src/components/stats/MiniBar.tsx`
- **Depends on:** Task 2.5, Task 3.1

### Task 3.12 리워드 해제 훅 (`useStatsUnlock`)
- **Description:** 24시간 해제 상태 판정과 리워드 광고 콜백 처리를 페이지와 분리된 훅으로 구현한다.
- **DoD:**
  - `src/hooks/useStatsUnlock.ts`가 `useStatsUnlock()` → `{ unlocked, onRewarded, onAdError, onAdClosed }` 반환.
  - `unlocked = rewardUnlock.statsUnlockedUntil > Date.now()`(마운트 시 1회 평가 + 상태 변경 시 재평가).
  - **`unlocked` 계산은 `records.length`를 참조하지 않는다(훅 내부에 `records` 참조 0건). 건수 게이트(`MIN_STATS_RECORDS`) 판정은 전적으로 Task 3.13 페이지가 수행하며, 두 조건은 AND로 결합된다.**
  - `onRewarded()` → `unlockStats()` 호출로 `gmc:rewardUnlock:v1.statsUnlockedUntil === (호출 시각 + 86400000)` 저장, `unlocked === true`로 전환.
  - `onAdError()` → Toast `광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요`, `statsUnlockedUntil` 갱신 0회, `console.error` 0개.
  - `onAdClosed({ rewarded: false })` → Toast `광고를 끝까지 봐야 리포트가 열려요`, `statsUnlockedUntil` 갱신 0회. `rewarded: true`면 `onRewarded()` 경로와 동일 결과.
  - 저장 실패(`ok:false`) 시에도 예외 미전파, `unlocked`는 `false` 유지.
- **Covers:** [F5-AC1(해제 저장), F5-AC2(유효기간 판정), F5-AC6, F5-AC7]
- **Files:** `src/hooks/useStatsUnlock.ts`
- **Depends on:** Task 2.3, Task 1.2

### Task 3.13 `/stats` 페이지 (무료 요약 + 건수 게이트 + 리워드 게이트)
- **Description:** 게이트 밖 요약 Card, **기록 건수 3구간(0건 / 1~2건 / 3건 이상) 분기**, 로딩 Skeleton, `TossRewardAd` 게이트와 `StatsDetail` 조립.
- **DoD:**
  - `src/pages/StatsPage.tsx` 루트 `ScreenScaffold` + Top + FloatingTabBar. 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - 게이트 밖에 무료 요약 Card 1개(총 건수·총 금액)를 **건수와 무관하게 상시 렌더**(0건이면 `0건` / `0원` 표기). `aggregate()`는 `useMemo`로 `records` 변경 시에만 재계산.
  - **건수 판정은 `constants.ts`의 `MIN_STATS_RECORDS`(=3)를 import해 `records.length < MIN_STATS_RECORDS` 단일 비교로만 수행한다. 파일 내 숫자 리터럴 `3`을 이용한 건수 비교 0건.**
  - **`records.length < MIN_STATS_RECORDS`(0건 및 1~2건 모두 포함)이면** `Asset.ContentIcon` + 정확히 `기록이 3건 이상 쌓이면 리포트를 볼 수 있어요` 문구를 표시하고, `상세 리포트 보기` 버튼·`TossRewardAd`·`data-testid="stats-detail"`이 **DOM에 모두 0개**다. 이는 `records.length === 0`, `=== 1`, `=== 2` 세 케이스 전부에서 동일하게 성립함을 확인한다.
  - **`unlocked === true`이더라도 `records.length < MIN_STATS_RECORDS`이면 `stats-detail`은 렌더되지 않고 위 잠금 안내가 유지된다**(해제 상태와 건수 조건은 AND). 이때 `statsUnlockedUntil` 값은 변경되지 않는다.
  - `ready === false`이면 Card 자리에 TDS Skeleton 3개 + `상세 리포트 보기` 버튼 `disabled={true}`.
  - `unlocked === false` && `records.length >= MIN_STATS_RECORDS`이면 `상세 리포트 보기` TDS Button(`display="block"`, 48px) + `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 게이트 렌더. 시청 완료 → `data-testid="stats-detail"` 표시.
  - `unlocked === true` && `records.length >= MIN_STATS_RECORDS`로 재진입 시 광고 없이 `stats-detail` 즉시 표시되고 `상세 리포트 보기` 버튼 DOM에 0개.
  - **경계 전이 검증: 기록 2건 상태에서 잠금 안내가 보이는 화면에 3번째 기록이 추가되어 `records`가 갱신되면, 리렌더 후 `상세 리포트 보기` 버튼이 나타나고(미해제 시) 안내 문구는 사라진다. 반대로 3건 상태에서 1건을 삭제해 2건이 되면 `stats-detail`이 사라지고 잠금 안내로 되돌아간다. 두 전이 모두 예외·`console.error` 0건.**
  - 광고 로드 실패·중도 이탈은 `useStatsUnlock`의 핸들러로 위임되어 게이트 잠금 유지 + 해당 Toast 표시, `console.error` 0개.
  - `TossRewardAd` 컴포넌트 내부 구현 수정 0건(슬롯 ID는 env 참조). `location.state` 참조 0개, 직접 진입해도 크래시 0건. `AdSlot` 0개.
- **Covers:** [F5-AC1, F5-AC2, F5-AC5, F5-AC6, F5-AC7, F5-AC8]
- **Files:** `src/pages/StatsPage.tsx`
- **Depends on:** Task 3.11, Task 3.12, Task 2.3, Task 1.2

### Task 3.14 `/share` 페이지 (미리보기 + 이미지 저장 + 문구 복사)
- **Description:** 캔버스 미리보기 Card, 저장/복사 액션, state 가드, 렌더링 중 상태를 구현한다.
- **DoD:**
  - `src/pages/SharePage.tsx` 루트 `ScreenScaffold`, Card 안에 `<canvas data-testid="share-canvas">`(aspect-ratio 1:1 커스텀 CSS 허용), SubmitFooter에 `이미지 저장`(display="block") / `문구 복사` 버튼 각 48px. 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - `const st = (useLocation().state as RouteState['/share']) ?? null;`로 읽고, `st === null`이거나 `isValidCalcResult(st.result) === false`면 Toast `공유할 결과가 없어요` 후 `navigate('/calc', { replace: true })`, 캔버스 렌더 시도 0회, 크래시 0건.
  - 마운트 시 `drawShareCard(canvasRef.current, result)` 실행 → `canvas.width === 1080 && canvas.height === 1080`. `isRendering === true` 동안 캔버스 위 TDS Skeleton + 버튼 2개 모두 `disabled={true}`.
  - `이미지 저장` 탭 → `canvas.toBlob` PNG → 동적 `a[download="giftmoney-card.png"]` 클릭 → `URL.revokeObjectURL` 호출 → Toast `이미지를 저장했어요`. `toBlob`이 null 반환 시 Toast로 실패 안내(예외·`console.error` 0개).
  - `문구 복사` 탭 → `navigator.clipboard.writeText(buildShareText(result))` → Toast `문구를 복사했어요`. reject 시 Toast `복사에 실패했어요. 화면을 길게 눌러 복사해주세요`, 화면 유지, `console.error` 0개.
  - 파일 내 `window.open`/`window.location.href` 0개, 카카오·인스타 등 외부 SNS 딥링크·설치 유도 문구 0개, `AdSlot` 0개, HEX 리터럴 0개.
- **Covers:** [F6-AC1(캔버스 크기·내용), F6-AC2, F6-AC3, F6-AC4, F6-AC5, F6-AC6, F6-AC7]
- **Files:** `src/pages/SharePage.tsx`
- **Depends on:** Task 2.4, Task 2.6, Task 3.1

### Task 3.15 `/` 홈 페이지 (유형 바로가기 + 최근 계산 + 배너)
- **Description:** 유형 4개 바로가기 ListRow, 최근 계산 요약 Card, 빈 상태, 로딩 Skeleton, AdSlot 배치를 한 파일에서 완성한다.
- **DoD:**
  - `src/pages/HomePage.tsx` 루트 `ScreenScaffold`, DOM 순서 = Top(title=`축의금 계산기`) → 유형 ListRow 4개 → `Spacing size={16}` → `last-calc-card`(또는 빈 상태 블록) → `Spacing size={16}` → `AdSlot` → FloatingTabBar. 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - 유형 ListRow(높이 ≥ 56px) 탭 시 `navigate('/calc', { state: { eventType } })`. `장례식` 탭 → `/calc`에서 유형 Chip `장례식` 선택 상태.
  - `lastCalc !== null`이면 `data-testid="last-calc-card"` Card에 `200,000원`과 `결혼식 · 친한 친구` 표시, 탭 시 `navigate('/result', { state: { input: lastCalc.input } })`.
  - `lastCalc === null`이면 `last-calc-card`가 DOM에 0개이고 `Asset.ContentIcon` + `첫 계산을 시작해보세요` 표시.
  - `ready === false`이면 유형 리스트 자리 Skeleton 4행 + 최근 계산 Card 자리 Skeleton 1개.
  - `loadError === true`이면 기본값 렌더 + Toast `저장된 데이터를 불러오지 못했어요`.
  - `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`가 이 화면에 **정확히 1개**, `data-testid="last-calc-card"`(빈 상태에서는 빈 상태 안내 블록)의 **다음 형제 노드**로 렌더. `position: fixed`/`z-index` 오버레이 스타일 0개, FloatingTabBar를 가리지 않음. `AdSlot` 내부 구현 수정 0건.
  - `location.state` 참조 0개, `console.error` 0개.
- **Covers:** [F7-AC1, F7-AC2, F7-AC3, F7-AC6(홈 배너)]
- **Files:** `src/pages/HomePage.tsx`
- **Depends on:** Task 2.3, Task 1.2

### Task 3.16 `/settings` 페이지 (기본 지역 · 목록 밀도 · 데이터 초기화)
- **Description:** 설정 화면의 ListRow/Switch/BottomSheet/AlertDialog를 구현한다.
- **DoD:**
  - `src/pages/SettingsPage.tsx` 루트 `ScreenScaffold` + Top + FloatingTabBar. ListRow 높이 ≥ 56px. 이 파일은 이후 어떤 패킷도 수정하지 않음.
  - `기본 지역` ListRow 탭 → TDS BottomSheet에 4개 지역 옵션(`REGION_OPTIONS`) → `서울 강남권` 선택 시 `gmc:settings:v1.defaultRegion === 'seoulGangnam'` 저장 + Toast `기본 지역을 변경했어요` + ListRow 보조 텍스트 즉시 갱신.
  - `목록 간략히 보기` TDS Switch(터치 영역 44×44px 이상) 토글 시 `settings.compactList` 저장.
  - 설정 저장 실패(`ok:false`) 시 Toast `설정을 저장하지 못했어요` + UI 상태 롤백.
  - `모든 기록 삭제` ListRow 탭 → TDS AlertDialog(확인/취소) → `삭제` 확인 시 `clearAll()` 실행으로 records `[]`, lastCalc `null`, rewardUnlock `{statsUnlockedUntil:0}` 재설정 + Toast `모든 기록을 삭제했어요`. `취소` 시 변경 0건.
  - **전체 삭제 직후 `/stats`로 이동하면 `records.length === 0`이므로 Task 3.13의 잠금 안내가 표시되고 `stats-detail`·`TossRewardAd`가 DOM에 0개임을 확인**(rewardUnlock 초기화로 해제 상태도 함께 해제됨).
  - `ready === false`이면 ListRow Skeleton 3행.
  - 하단에 버전·법률 고지를 TDS `Paragraph.Text`로만 표기, 외부 링크(anchor href, `window.open`) 0개. `AdSlot` 0개.
- **Covers:** [F7-AC4, F7-AC5]
- **Files:** `src/pages/SettingsPage.tsx`
- **Depends on:** Task 2.3, Task 3.2

---

## Epic 4. Integration + Compliance

**Risk Assessment**
- **Complexity:** Medium
- **Risk factors:** (1) 라우트 등록 누락/오타로 특정 화면이 NotFound로 빠짐. (2) FloatingTabBar가 `/calc`·`/result`·`/share`에서도 뜨면 SubmitFooter와 겹침. (3) HEX 하드코딩·외부 이탈 코드가 한 곳이라도 남으면 즉시 반려. (4) 배너 형제 관계는 페이지 파일을 다시 건드리면 확인 불가.
- **Mitigation:** 배너 배치는 소유 페이지 패킷(3.10, 3.15) 안에서 이미 완료했고, Epic 4는 **페이지 파일을 수정하지 않는 검증 전용 패킷**으로 구성해 파일 충돌을 원천 제거. 정적 스캔은 스크립트로 기계 검증한다.

### Task 4.1 라우터 배선 + NotFound + 탭 표시 규칙
- **Description:** react-router-dom 라우트 8개를 등록하고 NotFound 화면과 탭 노출 규칙을 확정한다.
- **DoD:**
  - `src/App.tsx`에 `/`, `/calc`, `/result`, `/record/new`, `/history`, `/stats`, `/settings`, `*` 8개 라우트 등록, 각 페이지 실제 진입 가능.
  - 템플릿 제공 `src/components/FloatingTabBar`를 **수정하지 않고** 사용하며, 홈(`/`)·기록(`/history`)·통계(`/stats`)·설정(`/settings`) 4개 탭만 노출. 탭 렌더 여부는 각 페이지가 결정(App에서 전역 강제 렌더 0건)하여 `/calc`·`/result`·`/record/new`·`/share`에는 나타나지 않음.
  - `src/pages/NotFoundPage.tsx`가 `ScreenScaffold` + `Asset.ContentIcon` + `페이지를 찾을 수 없어요` Paragraph.Text + `홈으로 가기` TDS Button(`display="block"`)을 렌더하고, 탭 시 `navigate('/', { replace: true })`. `/unknown` 진입 시 `console.error` 0개.
  - `/result`, `/share`, `/record/new`, `/calc` 4개 경로를 state 없이 직접 진입(주소창 입력/새로고침)해도 크래시·흰 화면 없이 리다이렉트 또는 빈 폼으로 처리됨을 4개 전부에서 확인.
  - 프로덕션 빌드 성공, 라우트 전환 시 `console.error` 0개.
- **Covers:** [F7-AC8]
- **Files:** `src/App.tsx`, `src/pages/NotFoundPage.tsx`
- **Depends on:** Task 3.3, Task 3.5, Task 3.7, Task 3.10, Task 3.13, Task 3.14, Task 3.15, Task 3.16

### Task 4.2 광고 비침범 배치 + 리워드 게이트 경계 검증 스크립트
- **Description:** 배너가 화면당 1개·지정 형제 위치·비오버레이인지, **그리고 통계 게이트가 상수 기반 단일 비교로 구현됐는지** 기계적으로 검증한다. **페이지 파일은 수정하지 않으며**, 위반이 발견되면 해당 페이지 소유 태스크(3.10/3.15/3.13)를 재실행하도록 리포트한다.
- **DoD:**
  - `scripts/ad-placement-check.mjs`가 `src/pages/**` 정적 스캔으로 다음을 검증하고 위반 시 non-zero exit + 파일·라인 리포트:
    - `AdSlot` 사용이 `HomePage.tsx` 1회, `HistoryPage.tsx` 1회, 총 2회이며 그 외 페이지(`ResultPage`, `SharePage`, `CalcPage`, `RecordNewPage`, `StatsPage`, `SettingsPage`) 0회.
    - `AdSlot`이 `adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID}`로만 호출됨(리터럴 ID 0건).
    - `AdSlot` 인접 100자 내 `position:\s*fixed` / `zIndex` / `z-index` 매치 0건.
    - **`TossRewardAd` 사용이 `StatsPage.tsx` 1회, 그 외 페이지 0회이며 `slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}`로만 호출됨.**
    - **`StatsPage.tsx`에 `MIN_STATS_RECORDS` import가 존재하고, `records.length` 비교식에 숫자 리터럴을 쓴 패턴(`records\.length\s*[<>=!]+\s*\d`) 매치 0건.**
  - 렌더 확인: 홈에서 `last-calc-card`(빈 상태에서는 빈 상태 블록)의 다음 형제, 히스토리에서 목록 마지막 ListRow(빈 상태에서는 `history-empty`)의 다음 형제로 AdSlot이 위치함을 실기기/시뮬레이터 DOM에서 확인한 결과를 기록.
  - **런타임 확인: `gmc:records:v1`을 0건 / 1건 / 2건 / 3건으로 각각 주입하고 `/stats`를 진입해 0·1·2건에서는 `상세 리포트 보기` 버튼과 `TossRewardAd`가 DOM에 0개, 3건에서는 1개씩 존재함을 4케이스 전부 기록한다.**
  - 스크립트 실행 결과 위반 0건. `src/**` 수정 0건(이 패킷은 검증 전용).
- **Covers:** [F7-AC6, F5-AC5(경계 검증)]
- **Files:** `scripts/ad-placement-check.mjs`
- **Depends on:** Task 4.1

### Task 4.3 검수 컴플라이언스 정적 스캔 + 마감
- **Description:** 검수 반려 요인을 정규식 스캔과 런타임 스모크로 제거하고 다크모드·구형 브라우저 호환을 마감한다. 위반 파일이 나오면 **해당 파일 1개만** 최소 수정한다.
- **DoD:**
  - `scripts/compliance-scan.mjs`가 `src/**/*.{ts,tsx,css}`를 스캔하고 위반 시 non-zero exit:
    - `#[0-9a-fA-F]{3,8}\b` 0건, `window\.open|window\.location\.href` 0건, `google-analytics|amplitude|mixpanel` 0건, `설치|다운로드받` 0건.
    - 금지 API: `findLast`, `Object.groupBy`, `structuredClone`, `Intl.Segmenter`, CSS `:has(` 각 0건.
    - 금지 UI 라이브러리 import: `@mui/`, `antd`, `@chakra-ui/`, `shadcn`, `components/ui/` 0건.
    - TDS 컴포넌트에 인라인 `style={{ padding|margin` 및 Tailwind `\bp-\d|\bm-\d` 클래스 0건.
  - 스캔 실행 결과 전 항목 0건(위반 발견 시 해당 파일 수정 후 재실행하여 0건 달성, 수정 내역을 리포트에 기록).
  - `vite build` 후 8개 라우트(`/`, `/calc`, `/result`, `/record/new`, `/history`, `/stats`, `/settings`, `/unknown`)를 순회하는 스모크 실행에서 `console.error` 출력 0개.
  - **스모크에 기록 0건 / 2건 / 3건 상태의 `/stats` 진입을 포함해 세 상태 모두 `console.error` 0개·흰 화면 0건임을 확인.**
  - 시스템 다크모드 ON/OFF 양쪽에서 8개 화면 텍스트·그래프가 배경과 구분됨(스크린샷 기록).
  - `tsc --noEmit` 및 `npm run lint`(설정된 경우) 통과.
- **Covers:** [F7-AC7, F6-AC4, F6-AC8]
- **Files:** `scripts/compliance-scan.mjs`
- **Depends on:** Task 4.2

---

## 파일 소유권 표 (충돌 0건 검증)

| 파일 | 소유 태스크 |
|---|---|
| `src/lib/types.ts` | 1.1 |
| `src/lib/constants.ts` | 1.2 |
| `src/lib/calc.ts`, `src/lib/format.ts` | 2.1 |
| `src/lib/storage.ts` | 2.2 |
| `src/store/StorageProvider.tsx`, `src/main.tsx` | 2.3 |
| `src/lib/shareCard.ts` | 2.4 |
| `src/lib/stats.ts` | 2.5 |
| `src/lib/guards.ts`, `src/lib/validation.ts` | 2.6 |
| `src/components/SubmitFooter.tsx`, `CountUp.tsx`, `SummaryHero.tsx` | 3.1 |
| `src/components/ChipGroup.tsx`, `src/lib/options.ts` | 3.2 |
| `src/pages/CalcPage.tsx` | 3.3 |
| `src/components/result/ResultContent.tsx` | 3.4 |
| `src/pages/ResultPage.tsx` | 3.5 |
| `src/components/record/RecordForm.tsx` | 3.6 |
| `src/pages/RecordNewPage.tsx` | 3.7 |
| `src/components/history/RecordList.tsx`, `src/hooks/useInfiniteList.ts` | 3.8 |
| `src/components/history/RecordActionSheet.tsx` | 3.9 |
| `src/pages/HistoryPage.tsx` | 3.10 |
| `src/components/stats/StatsDetail.tsx`, `Sparkline.tsx`, `MiniBar.tsx` | 3.11 |
| `src/hooks/useStatsUnlock.ts` | 3.12 |
| `src/pages/StatsPage.tsx` | 3.13 |
| `src/pages/SharePage.tsx` | 3.14 |
| `src/pages/HomePage.tsx` | 3.15 |
| `src/pages/SettingsPage.tsx` | 3.16 |
| `src/App.tsx`, `src/pages/NotFoundPage.tsx` | 4.1 |
| `scripts/ad-placement-check.mjs` | 4.2 |
| `scripts/compliance-scan.mjs` | 4.3 |

> 각 파일의 소유 태스크는 정확히 1개다. v2 변경(경계 조건 명확화)은 기존 소유 태스크의 DoD 문구만 수정했으므로 **파일 소유권 변동 0건**이다. 템플릿 제공 파일(`src/components/AdSlot`, `TossRewardAd`, `FloatingTabBar`, `ScreenScaffold`, localStorage helper)은 어떤 태스크도 수정하지 않는다.

---

## 통계 게이트 상태표 (경계 단일 정의 — Task 3.13 소유)

| `ready` | `records.length` | `unlocked` | 무료 요약 Card | 잠금 안내 문구 | `상세 리포트 보기` 버튼 | `TossRewardAd` | `stats-detail` |
|---|---|---|---|---|---|---|---|
| false | — | — | Skeleton ×3 | 미표시 | disabled | 0개 | 0개 |
| true | 0 | any | 표시(`0건`/`0원`) | 표시 | 0개 | 0개 | 0개 |
| true | 1~2 | any | 표시 | 표시 | 0개 | 0개 | 0개 |
| true | ≥3 | false | 표시 | 미표시 | 1개 | 1개 | 광고 완료 시 표시 |
| true | ≥3 | true | 표시 | 미표시 | 0개 | 0개 | 즉시 표시 |

> 판정식은 `ready === true && records.length >= MIN_STATS_RECORDS && unlocked === true → stats-detail` 하나뿐이며, 그 외 3구간은 위 표대로 폴백한다. `unlocked`는 Task 3.12가, 건수 조건은 Task 3.13이 단독 소유한다.

---

## AC Coverage

- **Total ACs in SPEC:** 55 (F1:8, F2:7, F3:8, F4:8, F5:8, F6:8, F7:8)
- **Covered by tasks:** 55

| Feature | AC | Task |
|---|---|---|
| F1 | AC1 | 1.2, 2.1 |
| F1 | AC2 | 1.2, 2.1 |
| F1 | AC3 | 1.2, 2.1 |
| F1 | AC4 | 1.1, 2.2 |
| F1 | AC5 | 2.2 |
| F1 | AC6 | 2.2 |
| F1 | AC7 | 1.2, 2.2 |
| F1 | AC8 | 2.3 |
| F2 | AC1 | 3.3 |
| F2 | AC2 | 3.3 |
| F2 | AC3 | 3.3 |
| F2 | AC4 | 3.2, 3.3 |
| F2 | AC5 | 3.3 |
| F2 | AC6 | 3.3 |
| F2 | AC7 | 3.3 |
| F3 | AC1 | 3.4, 3.5 |
| F3 | AC2 | 3.4 |
| F3 | AC3 | 3.4 |
| F3 | AC4 | 3.4 |
| F3 | AC5 | 3.5 |
| F3 | AC6 | 1.1, 3.5 |
| F3 | AC7 | 2.6, 3.5 |
| F3 | AC8 | 3.1, 3.4 |
| F4 | AC1 | 3.7 |
| F4 | AC2 | 2.6, 3.7 |
| F4 | AC3 | 2.6, 3.7 |
| F4 | AC4 | 3.6, 3.7 |
| F4 | AC5 | 3.10 |
| F4 | AC6 | 3.8, 3.10 |
| F4 | AC7 | 3.9, 3.10 |
| F4 | AC8 | 3.7 |
| F5 | AC1 | 3.12, 3.13 |
| F5 | AC2 | 3.12, 3.13 |
| F5 | AC3 | 2.5, 3.11 |
| F5 | AC4 | 3.11 |
| F5 | AC5 | **1.2, 3.13, 4.2** |
| F5 | AC6 | 3.12, 3.13 |
| F5 | AC7 | 3.12, 3.13 |
| F5 | AC8 | 3.13 |
| F6 | AC1 | 2.4, 3.14 |
| F6 | AC2 | 3.14 |
| F6 | AC3 | 2.4, 3.14 |
| F6 | AC4 | 3.14, 4.3 |
| F6 | AC5 | 3.14 |
| F6 | AC6 | 1.1, 3.14 |
| F6 | AC7 | 3.14 |
| F6 | AC8 | 2.4, 4.3 |
| F7 | AC1 | 3.3, 3.15 |
| F7 | AC2 | 3.15 |
| F7 | AC3 | 3.15 |
| F7 | AC4 | 3.16 |
| F7 | AC5 | 2.2, 3.16 |
| F7 | AC6 | 3.10, 3.15, 4.2 |
| F7 | AC7 | 4.3 |
| F7 | AC8 | 4.1 |

- **Uncovered:** 0 ✅
- **경계 미정의:** 0 ✅ (F5-AC5의 1~2건 구간이 Task 3.13 DoD + 게이트 상태표 + Task 4.2 런타임 4케이스 확인으로 정의됨)

---

## 실행 순서 요약

```
1.1 → 1.2 ─┬─ 2.1 ─┬─ 2.4 ────────────────┐
           ├─ 2.2 → 2.3                    │
           ├─ 2.5                          │
           └─ 2.6                          │
                    ↓ (Epic 2 완료)         │
        3.1(공용 컴포넌트) · 3.2(ChipGroup) │
                    ↓                       │
   ┌── 3.3  /calc                          │
   ├── 3.4 → 3.5  /result                  │
   ├── 3.6 → 3.7  /record/new              │
   ├── 3.8 · 3.9 → 3.10  /history          │
   ├── 3.11 · 3.12 → 3.13  /stats          │
   ├── 3.14  /share ←──────────────────────┘
   ├── 3.15  /
   └── 3.16  /settings
                    ↓
              4.1 → 4.2 → 4.3
```

- Epic 2 완료 후 Epic 3의 7개 화면 체인은 **서로 독립**이라 병렬 진행 가능(공용 파일을 공유하지 않음).
- Task 3.13은 `MIN_STATS_RECORDS`(1.2)를 추가로 의존하지만 이는 Epic 1 산출물이므로 병렬성에 영향 없음.
- Epic 4는 모든 페이지 완료 후 시작하며, **페이지 파일을 수정하지 않는 검증 전용 패킷**이라 충돌이 발생하지 않는다.