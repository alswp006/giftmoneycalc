# TASK

> SPEC v2 기준 **24개 작업 패킷**. 각 패킷은 10분 내 완료 가능하며, 완료 시점마다 `tsc --noEmit` + `vite build` 가 통과해야 한다.
> **파일 소유권 규약(검증 오류 대응):** 모든 파일은 **정확히 한 패킷만** 생성/수정한다. 한 화면이 여러 관심사를 가지면 화면 파일을 마지막 패킷이 소유하고, 선행 패킷은 **독립 컴포넌트 파일**을 만들어 조립 대상으로 넘긴다. 선행 패킷이 만든 파일은 후행 패킷에서 **import(읽기)만** 하며 Files에 다시 적지 않는다.
> 경로 규약: 순수 로직 `src/domain/`, 저장소 `src/storage/`, 상태 `src/state/`, 조립 화면 `src/pages/`, 재사용 컴포넌트 `src/components/`, 공용 타입 `src/lib/types.ts`.

---

## Epic 1. 타입 & 상수 (순수 선언, 런타임 로직 0)

**Risk Assessment**
- **Complexity:** Low
- **Risk factors:**
  - `src/domain/types.ts`(SPEC §1.1 규범 경로)와 `src/lib/types.ts`(RouteState 규약 경로)가 이원화되어 import 경로 혼선 발생 가능
  - RouteState를 나중에 정의하면 F3→F4 네비게이션 페이로드가 페이지마다 제각각이 되어 `/result` 크래시(2026-08-03 SplitMate 사고 재현)
  - 열거형과 룰 테이블 키가 어긋나면 F2 골든 케이스가 전부 깨짐
- **Mitigation:** Epic 1을 최우선 배치해 모든 후속 패킷이 단일 타입 소스를 import하게 강제. `src/lib/types.ts`는 `src/domain/types.ts`를 re-export만 하는 얇은 배럴로 규정해 이원화 제거. 룰 테이블을 `Record<EventType, number>`로 선언해 키 누락 시 컴파일 에러 유도.

### Task 1.1 도메인 타입 · 열거형 · RouteState 정의
- **Description:** SPEC §1.1/§1.2의 열거형(`EVENT_TYPES`, `RELATIONS`), 관대 타입(`StoredEventType`, `StoredRelation`), `HistoryRecord`, 계산 엔진 입출력 타입, 저장소 결과 타입을 선언한다. 이어서 `src/lib/types.ts`에 도메인 타입 re-export + **RouteState** 를 정의한다. 런타임 로직 0(상수 배열 선언만 허용).
- **DoD:**
  - `src/domain/types.ts`에 `EVENT_TYPES`(4개), `RELATIONS`(6개), `EventType`, `Relation`, `StoredEventType`, `StoredRelation`, `HistoryRecord`(§1.2 필드 전부, `counterpartLabel`/`memo`만 optional) 존재
  - `CalculationInput = { eventType: EventType; relation: Relation; attended: boolean; companions: number; eventDate: string }`
  - `CalculationResult = { recommended: number; breakdown: { base; relationMultiplier; mealCost; companions; subtotal; rounded; clamped }; ruleVersion: 1 }` — F2 AC-2 시그니처와 문자 단위 일치
  - `StorageResult<T> = { ok: true; value: T } | { ok: false; code: 'INVALID_RECORD' | 'RECORD_LIMIT_EXCEEDED' | 'QUOTA_EXCEEDED' | 'CORRUPTED' | 'READ_ONLY_VERSION'; field?: string }`
  - `src/lib/types.ts`에 아래 RouteState 존재:
    ```ts
    export type RouteState = {
      '/result': { input: CalculationInput } | { recordId: string } | null;
      '/history/:id': { from?: 'list' | 'result' } | null;
      '/': { prefill?: Partial<CalculationInput> } | null;
      '/stats': null;
    };
    ```
  - `tsc --noEmit` 통과, 두 파일에 `function`/`=>`/`Date`/`Math` 문자열 0건
- **Covers:** [F2 AC-2]
- **Files:** `src/domain/types.ts`, `src/lib/types.ts`
- **Depends on:** none

### Task 1.2 룰 테이블 상수 · 저장소 키 · Envelope 타입
- **Description:** §1.5 룰 테이블과 §1.3 저장소 키/버전 상수 및 Envelope 타입 3종을 선언한다.
- **DoD:**
  - `src/domain/rules.ts`: `BASE_AMOUNT`/`MEAL_COST`는 `Record<EventType, number>`, `RELATION_MULTIPLIER`는 `Record<Relation, number>`, `MIN_AMOUNT`/`MAX_AMOUNT`/`RULE_VERSION = 1` export. 키 1개 삭제 시 `tsc` 실패를 수동 확인
  - 값이 §1.5와 정확히 일치: BASE WEDDING/FUNERAL/OPENING 50000, FIRST_BIRTHDAY 30000 / MULT FAMILY 4.0, RELATIVE 2.0, CLOSE_FRIEND 2.0, FRIEND 1.0, COWORKER 1.0, ACQUAINTANCE 0.6 / MEAL WEDDING 30000, FUNERAL 20000, FIRST_BIRTHDAY 30000, OPENING 20000 / MIN 30000, MAX 1000000
  - `src/storage/keys.ts`: `SCHEMA_VERSION = 1 as const`, `STORAGE_KEYS` 4개 문자열이 §1.3과 바이트 단위 일치(`gyeongjo:v1:records` 등), `CORRUPT_KEY_PREFIX = 'gyeongjo:corrupt:'`, `RecordsEnvelope`/`SettingsEnvelope`/`RewardEnvelope` 타입 export
  - `tsc --noEmit` 통과
- **Covers:** [F2 AC-2]
- **Files:** `src/domain/rules.ts`, `src/storage/keys.ts`
- **Depends on:** Task 1.1

---

## Epic 2. 데이터 레이어 (계산 엔진 + 저장소 + 상태)

**Risk Assessment**
- **Complexity:** High
- **Risk factors:**
  - `localStorage` 5MB 한도: 500건 × 약 300B ≈ 150KB로 여유가 있으나 손상 백업(`gyeongjo:corrupt:*`)이 원본을 복제해 최악 2배 + QuotaExceeded 경로 미구현 시 앱 크래시(F1 AC-6)
  - 계산 엔진에 `Date.now`/`Math.random`이 섞이면 F2 AC-1 정적 스캔과 F8 AC-10이 동시 실패 → 검수 반려
  - UUID 폴백을 `src/domain/`에 두면 F1 AC-8과 F2 AC-1이 정면 충돌
  - 낙관적 업데이트 롤백을 화면마다 구현하면 F5 AC-8이 중복/누락
- **Mitigation:** 계산 엔진(2.1)과 저장소(2.2~2.4)를 다른 디렉터리로 물리 분리하고 UUID 폴백은 2.2의 `src/storage/uuid.ts`에만 생성. 저수준 Envelope I/O(2.2)를 CRUD(2.3)보다 먼저 완성해 손상/쿼터 경로가 CRUD 전체에 자동 적용. 상태 관리(2.6)를 Epic 3보다 앞에 두어 롤백 로직을 단일 지점에 봉인.

### Task 2.1 계산 엔진 `calculate()` + 골든 케이스 테스트
- **Description:** §1.5 공식대로 `calculate(input: CalculationInput): CalculationResult`를 구현하고 골든 6종·클램프·검증 예외 테스트를 작성한다. `Date`/`Math.random`/`crypto` 금지(`Math.ceil`/`min`/`max`는 허용 — 스캔 정규식을 `Math.random`으로 한정).
- **DoD:**
  - `raw = BASE * MULT + (attended ? MEAL * (1 + companions) : 0)` → `ceil(raw/10000)*10000` → `clamp(30000, 1000000)` 순서 구현
  - 골든 6종 하드코딩 일치: ①50,000 ②80,000 ③110,000 ④100,000 ⑤50,000 ⑥260,000
  - `clamped` 플래그: 클램프 시 `true`, 아니면 `false` — 하한/상한 각 1케이스 테스트
  - `companions` 비정수/음수/9초과 → `RangeError`, 메시지에 `'companions'` 포함(4케이스)
  - `eventType`/`relation` 유니온 밖 → `TypeError`, 메시지에 입력 원문 포함(2케이스)
  - `attended === false` × `companions 0~9` 10케이스 `JSON.stringify` 동일 + `breakdown.mealCost === 0`
  - 동일 입력 100회 호출 결과 `JSON.stringify` 100개 전부 동일
  - 정적 스캔 테스트: `src/domain/**`에 `Date.now`, `new Date`, `Math.random`, `crypto.` 출현 0건
- **Covers:** [F2 AC-1, F2 AC-2, F2 AC-3, F2 AC-4, F2 AC-5, F2 AC-6, F2 AC-7]
- **Files:** `src/domain/calculate.ts`, `src/domain/__tests__/calculate.test.ts`, `src/domain/__tests__/determinism.scan.test.ts`
- **Depends on:** Task 1.2

### Task 2.2 저장소 저수준 I/O — Envelope · 손상 격리 · 마이그레이션 · UUID 폴백
- **Description:** 모든 Envelope에 공통 적용되는 안전 I/O 계층(`readEnvelope`, `writeEnvelope`, `migrations`, `newUuid`)을 만든다. CRUD는 다음 패킷.
- **DoD:**
  - `readEnvelope<T>(key, fallback)`: `JSON.parse` 실패 또는 `schemaVersion` 누락/비정수/스키마 불일치 → 원본 문자열을 `gyeongjo:corrupt:<suffix>`로 복사 → 원 키를 `fallback`으로 재초기화 → `{ ok:false, code:'CORRUPTED' }` 반환. **예외를 상위로 던지지 않음**(전면 try/catch). 원본 미삭제(테스트: corrupt 키 값 === 주입 원본 문자열)
  - `schemaVersion < SCHEMA_VERSION` → `migrations: Record<number, (prev: unknown) => unknown>` 오름차순 순차 적용 후 저장·반환
  - `schemaVersion > SCHEMA_VERSION` → **쓰기 금지**, `{ ok:false, code:'READ_ONLY_VERSION' }` + 빈 목록. 호출 전후 `localStorage.getItem(key)` 문자열 동일
  - 키 부재 → 빈 Envelope(`{ schemaVersion:1, updatedAt, records: [] }`) 초기화 후 반환
  - `writeEnvelope`: `setItem`이 `QuotaExceededError` 또는 `name === 'NS_ERROR_DOM_QUOTA_REACHED'` 예외 → `{ ok:false, code:'QUOTA_EXCEEDED' }`, 크래시 없음
  - `src/storage/uuid.ts`: `crypto.randomUUID` 있으면 사용, `undefined`면 `Math.random` v4 폴백. 폴백 1,000회 전부 `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/` 만족
  - 소스 스캔: `src/domain/**`에서 `storage/uuid` import 0건
- **Covers:** [F1 AC-5, F1 AC-6, F1 AC-7, F1 AC-8]
- **Files:** `src/storage/envelope.ts`, `src/storage/migrations.ts`, `src/storage/uuid.ts`, `src/storage/__tests__/envelope.test.ts`, `src/storage/__tests__/uuid.test.ts`
- **Depends on:** Task 1.2

### Task 2.3 레코드 CRUD — `saveRecord` / `updateRecord` / `deleteRecord` / `listRecords`
- **Description:** 2.2의 안전 I/O 위에 `HistoryRecord` CRUD를 구현한다. 필수 필드 검증·ID/타임스탬프 생성·500건 상한·불변 필드 보호를 이 패킷에서 마무리.
- **DoD:**
  - `saveRecord(input)`: 11개 필수 필드 중 하나라도 `undefined`/`null` → 저장 없이 `{ ok:false, code:'INVALID_RECORD', field:'<필드명>' }`. **11케이스 전부 `ok === false` 및 `field` 일치**
  - 신규 저장 시 `id`가 UUID v4 정규식 만족, `createdAt === updatedAt`, 두 값 모두 `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/` 만족
  - `updateRecord(id, patch)`: `patch.id`/`patch.createdAt`이 있어도 무시(테스트), 갱신 후 `id`·`createdAt`은 문자 단위 동일, `updatedAt`은 변경
  - `deleteRecord(id)`: 해당 1건만 제거, 나머지 건수 불변
  - 500건 상태에서 `saveRecord` → `{ ok:false, code:'RECORD_LIMIT_EXCEEDED' }`, **저장 전후 records JSON 문자열 바이트 동일**(FIFO 자동 삭제 없음)
  - `listRecords()`는 손상/다운그레이드 시에도 빈 배열 반환, 예외 미전파
- **Covers:** [F1 AC-1, F1 AC-2, F1 AC-3, F1 AC-4]
- **Files:** `src/storage/records.ts`, `src/storage/__tests__/records.test.ts`
- **Depends on:** Task 2.2

### Task 2.4 설정 · 리워드 · 온보딩 저장소
- **Description:** `SettingsEnvelope`, `RewardEnvelope`, 온보딩 플래그 접근자를 구현하고, 리워드 시각 이상값 정규화를 저장소에서 처리해 UI가 원시값을 다루지 않게 한다.
- **DoD:**
  - `getSettings()` / `setSettings(patch)`: 키 부재 시 `{ schemaVersion:1 }` 반환, 부분 갱신 시 다른 필드 보존
  - `getReward()`: `lastUnlockedAt`이 `NaN`/비수/누락이면 `null` 반환, 정상 숫자면 그대로 반환
  - `setRewardUnlockedNow()`: `lastUnlockedAt = Date.now()` 저장 후 `{ ok:true }`
  - `isUnlocked(now, reward)` 순수 헬퍼: `reward === null → false`, `now - lastUnlockedAt < 86_400_000 → true`(음수 포함). `remainingMs = Math.max(0, 86_400_000 - (now - lastUnlockedAt))` 로 클램프해 반환
  - 테스트 3케이스: `lastUnlockedAt`이 (a) `Date.now() + 86_400_000` (b) `NaN` (c) `undefined` — (a) 크래시 없음 + `isUnlocked === true` + 남은 시간 문자열에 `-` 미포함, (b)(c) `isUnlocked === false`
  - `isOnboarded()` / `markOnboarded()`: `gyeongjo:v1:onboarded` 키를 `'1'`로 저장/조회
  - 저장 실패 시 전부 `{ ok:false, code:'QUOTA_EXCEEDED' }` 반환, 크래시 없음
- **Covers:** [F6 AC-7]
- **Files:** `src/storage/settings.ts`, `src/storage/reward.ts`, `src/storage/onboard.ts`, `src/storage/__tests__/reward.test.ts`
- **Depends on:** Task 2.2

### Task 2.5 집계 순수 함수 `aggregate()`
- **Description:** `aggregate(records: HistoryRecord[])`를 순수 함수로 구현한다. 미지 `eventType`도 원본 문자열 키로 집계(라벨링은 UI 책임).
- **DoD:**
  - 반환 타입이 `{ totalCount: number; totalAmount: number; avgAmount: number; byEventType: Record<string, {count:number; sum:number}>; monthly: Array<{ym:string; sum:number}> }` 와 정확히 일치
  - `avgAmount = Math.round(totalAmount / totalCount)`, `totalCount === 0`이면 `avgAmount === 0`(`NaN` 반환 금지 — 테스트)
  - `monthly`는 `eventDate.slice(0,7)` 기준 `ym` 오름차순, 동일 `ym` 합산
  - `byEventType` 키는 `StoredEventType` 원본 문자열(`'???'` 포함 픽스처 검증)
  - 동일 입력 100회 결과 `JSON.stringify` 전부 동일, `src/domain/aggregate.ts`에 `Date.now`/`new Date`/`Math.random` 0건
- **Covers:** [F6 AC-1]
- **Files:** `src/domain/aggregate.ts`, `src/domain/__tests__/aggregate.test.ts`
- **Depends on:** Task 1.1

### Task 2.6 상태 관리 — `RecordsProvider` + `useRecords` (낙관적 업데이트 & 롤백)
- **Description:** 레코드 목록을 전역 공유하는 경량 Context 스토어. 변경은 낙관적으로 반영하고, 저장소 실패 시 이전 스냅샷으로 롤백 + 실패 코드를 호출부에 반환한다.
- **DoD:**
  - `RecordsProvider`가 마운트 시 `listRecords()` 1회 로드, `loading`/`records`/`error` 노출
  - `useRecords()`가 `{ records, add, update, remove, reload, lastError }` 반환
  - `remove(id)`/`update(id, patch)`는 ①로컬 state 즉시 반영 ②저장소 호출 ③`ok === false`면 **이전 배열로 롤백** + 실패 코드 반환. 테스트: `writeEnvelope`를 `QUOTA_EXCEEDED`로 목킹 → 호출 후 `records`가 직전 배열과 깊은 값 동일 + 반환값 `{ ok:false, code:'QUOTA_EXCEEDED' }`
  - 롤백 후 `records`와 `listRecords()` 재조회 결과 일치(불일치 0건)
  - Provider 없이 `useRecords()` 호출 시 명확한 에러 메시지 throw
  - 이 패킷 완료 시점에 UI 변경 없이 `vite build` 통과
- **Covers:** [F5 AC-8]
- **Files:** `src/state/RecordsContext.tsx`, `src/state/__tests__/RecordsContext.test.tsx`
- **Depends on:** Task 2.3

---

## Epic 3. UI — 컴포넌트 먼저, 화면 조립은 마지막

> **파일 충돌 제거 원칙:** `CalculatePage.tsx`(3.2), `ResultPage.tsx`(3.6), `StatsPage.tsx`(3.11)는 **각각 단 한 패킷만** 소유한다. 그 화면의 나머지 관심사(저장 시트·배너·공유 카드·리워드 게이트·상세 차트)는 선행 패킷에서 **독립 컴포넌트 파일**로 완성되어 화면 패킷이 조립만 한다.

**Risk Assessment**
- **Complexity:** High
- **Risk factors:**
  - **`location.state` 없이 `/result` 직접 진입 → 크래시**(웹뷰 새로고침·딥링크에서 state는 항상 없다). 2026-08-03 SplitMate 사고: 결과 배열이 `undefined`인 채 `.map()` 호출로 가상 사용자 3인 전원 완주 0%
  - TDS 컴포넌트에 `className`/`style`로 padding·margin 지정 시 F8 AC-6 실패 → 검수 즉시 반려
  - 광고 식별자 교차 사용(`adGroupId` ↔ `slotId`)은 §1.6 계약 위반이며 F8 AC-7 CI 실패
  - 500건 목록 전량 렌더 시 첫 페인트 400ms 초과(F5 AC-3)
  - 광고 env 누락 환경에서 통계 상세가 영구 잠금되어 기능 접근 불가(F6 AC-9)
  - 동일 화면 파일을 여러 패킷이 편집하면 병합 충돌·계약 드리프트 발생(이번 수정으로 제거)
- **Mitigation:** 화면 파일 단일 소유권 + 컴포넌트 선행 완성 순서를 depends_on으로 고정. `/result` 진입 가드를 화면 조립 패킷(3.6)의 1순위 DoD로 명시하고, state 수신 화면마다 "state 없이 직접 진입해도 크래시하지 않는다" AC를 개별 부여. 광고 컴포넌트(3.4/3.10)를 독립 파일로 분리해 env 폴백을 화면과 무관하게 단위 검증.

### Task 3.1 계산 입력 폼 컴포넌트 `CalculateForm` (Chip · Switch · TextField)
- **Description:** 경조사 유형 4종 Chip, 관계 6종 Chip, 참석 Switch, 동반 인원 TextField, CTA Button을 **props 주도(controlled) 컴포넌트**로 구현한다. 저장소·라우터 의존 0(값과 `onSubmit` 콜백만 받음).
- **DoD:**
  - TDS `Top`, `Chip`, `Switch`, `TextField`, `Button`, `Spacing`만 사용. `shadcn`/`@mui/`/`antd`/`@chakra-ui/` import 0건
  - 이 파일의 TDS JSX에 `className`/`style`로 `padding`·`margin`·`gap` 지정 0건. 간격은 `<Spacing size={...} />`로만
  - 동반 인원 `TextField`에 `inputMode="numeric"`
  - 유형 또는 관계 미선택이면 CTA에 `disabled` 존재 + 탭해도 `onSubmit` 호출 0회(스파이). 둘 다 선택 시 `disabled` 해제
  - 숫자 외 문자 입력 시 값이 직전 유효값 유지, CTA `disabled` 상태 불변(테스트: `'3a'` 입력 → 값 `'3'`)
  - `10` 이상 입력 시 값이 `9`로 고정 + 헬퍼 텍스트 `"최대 9명"` 노출
  - 모든 탭 가능 요소 렌더 박스 ≥ 44×44 px(DOM 측정 또는 CSS `min-height/min-width` 명시)
  - `props` 없이(기본값만으로) 렌더해도 크래시 0건
- **Covers:** [F3 AC-1, F3 AC-2, F3 AC-5, F3 AC-7]
- **Files:** `src/components/CalculateForm.tsx`, `src/components/__tests__/CalculateForm.test.tsx`
- **Depends on:** Task 1.1

### Task 3.2 `/` 화면 조립 — 프리필 · 네비게이션 · 뒤로가기 복원
- **Description:** 3.1의 `CalculateForm`을 감싸 설정 프리필, `/result` 네비게이션, 뒤로가기 입력 복원을 담당하는 화면을 만든다. **이 패킷이 `CalculatePage.tsx`의 유일한 소유자다.**
- **DoD:**
  - 마운트 시 `getSettings()`의 `defaultRelation`/`defaultAttended`가 있으면 프리필. 없으면 관계 미선택 + `attended === true`가 초깃값(2케이스)
  - CTA 제출 시 `navigate('/result', { state: { input } as RouteState['/result'] })` 호출, `input`에 `eventType`, `relation`, `attended`, `companions`, `eventDate` 5종 전부 포함(스파이 인자 전량 검증)
  - `location.state`를 `const state = (useLocation().state as RouteState['/']) ?? null;` 로 받고 **null 체크 후** `state?.prefill`만 사용
  - **state 없이 `/`로 직접 진입해도 크래시하지 않고 기본 폼을 렌더한다**(테스트: `MemoryRouter initialEntries={['/']}`, state 없음 → 렌더 예외 0건)
  - 결과 화면에서 뒤로가기 시 입력 5종 그대로 복원(sessionStorage 또는 navigate state 왕복 택1). 테스트: 입력 → 이동 → `history.back()` → 5개 필드 값 동일
  - `eventDate` 기본값은 오늘 `'YYYY-MM-DD'`(로컬 달력). 이 로직은 `src/pages/`에만 존재하고 `src/domain/`에 넣지 않는다
- **Covers:** [F3 AC-3, F3 AC-4, F3 AC-6]
- **Files:** `src/pages/CalculatePage.tsx`, `src/pages/__tests__/CalculatePage.test.tsx`
- **Depends on:** Task 3.1, Task 2.4

### Task 3.3 저장 BottomSheet 컴포넌트 `SaveRecordSheet`
- **Description:** "이 금액으로 기록하기" 이후의 저장 플로우를 독립 컴포넌트로 구현한다. `{ open, input, recommended, onClose, onSaved }` props만 받고 화면 파일은 건드리지 않는다.
- **DoD:**
  - 열림 시 TDS `BottomSheet` 내부에 실제 낸 금액 `TextField`(기본값 = 추천 금액), 상대 표기(선택, 20자 초과 입력 불가), 메모(선택, 100자 초과 입력 불가)
  - 저장 시 `saveRecord`가 **정확히 1회** 호출(스파이 call count === 1, 더블 탭 시에도 1회)
  - 저장 객체에서 `amount`는 사용자 입력값, `recommendedAmount`는 엔진 산출값으로 보존(테스트: 추천 80,000 / 입력 100,000 → 각각 100000, 80000)
  - `RECORD_LIMIT_EXCEEDED` 반환 시 `AlertDialog`에 `"기록은 최대 500건까지 저장할 수 있어요. 히스토리에서 오래된 기록을 삭제해 주세요."` 노출, 확인 시 `/history` 이동, **입력값 3종 소실 없음**(다이얼로그 취소 후 값 유지 테스트)
  - `QUOTA_EXCEEDED` 또는 `INVALID_RECORD` 반환 시 실패 Toast + **시트 열린 상태 유지**(재시도 가능)
  - `ok === true`일 때만 시트가 닫히고 성공 Toast + `onSaved(record)` 호출
  - TDS JSX에 padding/margin 인라인 지정 0건
- **Covers:** [F4 AC-3, F4 AC-4, F4 AC-5, F4 AC-7]
- **Files:** `src/components/SaveRecordSheet.tsx`, `src/components/__tests__/SaveRecordSheet.test.tsx`
- **Depends on:** Task 2.6

### Task 3.4 배너 광고 컴포넌트 `ResultBanner` (env 누락 폴백)
- **Description:** §1.6 규범대로 **광고 그룹 ID(`VITE_TOSS_AD_GROUP_ID`)** 만 사용하는 배너 래퍼를 독립 파일로 만든다. 리워드 슬롯 ID와 교차 사용 금지.
- **DoD:**
  - 컴포넌트 내부에 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 가 정확히 1개
  - `AdSlot`에 전달된 prop이 `VITE_TOSS_AD_GROUP_ID`임을 검증하는 테스트 존재. 이 파일에서 `VITE_TOSS_AD_SLOT_ID` 참조 0건(소스 스캔)
  - 광고 ID 리터럴 하드코딩 0건 — `import.meta.env` 경유만
  - env를 `''`로 stub → 반환값 `null`(`AdSlot` 노드 0개, 빈 배너 박스·로딩 스피너 잔존 0건), `console.error` 호출 0회. `undefined` stub도 동일
  - 컴포넌트가 자체 padding/margin 인라인 지정 없이 렌더되며 부모 레이아웃(하단 고정 컨테이너)에만 의존
- **Covers:** [F4 AC-2, F4 AC-8]
- **Files:** `src/components/ResultBanner.tsx`, `src/components/__tests__/ResultBanner.test.tsx`
- **Depends on:** Task 1.1

### Task 3.5 공유 카드 — Canvas 렌더러 + `ShareCardSheet`
- **Description:** 1080×1080 캔버스 렌더 함수와, 그것을 띄우고 공유/저장을 분기하는 시트 컴포넌트를 만든다. **별도 라우트를 추가하지 않는다**(F8 AC-1의 6개 라우트 계약 유지) — 결과 화면이 조립한다.
- **DoD:**
  - `renderShareCard(ctx, data)`: 논리 크기 1080×1080, `devicePixelRatio` 반영(`canvas.width = 1080 * dpr`, CSS 크기 1080 기준)
  - 렌더 텍스트는 **금액 · 경조사 유형 · 관계 · 앱 워터마크 4종뿐**. `counterpartLabel`·`memo`·날짜 렌더 0건(스냅샷 테스트로 텍스트 노드 4종만 존재 검증)
  - `typeof navigator.share === 'function'`이면 버튼 라벨 `"공유하기"` + `navigator.share({ files: [png] })` 호출
  - 미지원 시 라벨 `"이미지 저장"` + 카드 하단에 `"이미지를 길게 눌러 저장하세요"` 안내. 탭 시 무반응/크래시 0건
  - `AbortError` reject → Toast 호출 0회 + 원 화면 유지. 그 외 에러 → Toast `"공유하지 못했어요"` 1회
  - 카드 생성 전 과정에서 `fetch`/`XMLHttpRequest` 스파이 호출 0회
  - **`record`/`input` props가 `null`/`undefined`로 들어와도 크래시하지 않고 시트를 열지 않는다**(빈 상태 반환)
- **Covers:** [F7 AC-1, F7 AC-2, F7 AC-3, F7 AC-4, F7 AC-5]
- **Files:** `src/lib/renderShareCard.ts`, `src/components/ShareCardSheet.tsx`, `src/components/__tests__/ShareCardSheet.test.tsx`
- **Depends on:** Task 1.1

### Task 3.6 `/result` 화면 조립 — state 가드 · 히어로 · breakdown
- **Description:** 전달받은 입력으로 `calculate()`를 호출해 히어로 금액·내역을 렌더하고, 3.3/3.4/3.5의 컴포넌트를 조립한다. **이 패킷이 `ResultPage.tsx`의 유일한 소유자다. state 부재 방어가 1순위 산출물이다.**
- **DoD:**
  - 진입 가드가 아래 패턴으로 구현(캐스팅만으로 방어하지 않음):
    ```tsx
    const state = (useLocation().state as RouteState['/result']) ?? null;
    if (!state || !('input' in state)) return <Navigate to="/" replace />;
    ```
  - **state 없이 `/result` 직접 진입(새로고침·딥링크)해도 크래시하지 않고 `/`로 `replace` 리다이렉트.** 테스트: `MemoryRouter initialEntries={['/result']}`(state 없음) → 렌더 예외 0건 + 현재 경로 `'/'`
  - 소스 스캔: `const { ... } = useLocation().state as` 형태의 즉시 구조분해 0건
  - 히어로에 `recommended`가 `#,###원` 포맷으로 **정확히 1회** 렌더(`toLocaleString('ko-KR')`)
  - breakdown 카드에 `base`, `relationMultiplier`, `mealCost × (1+companions)`, `rounded` 4개 항목이 각각 `ListRow` 1개로 렌더(ListRow 개수 === 4)
  - `<SaveRecordSheet>`, `<ShareCardSheet>` 를 CTA로 열고, `<ResultBanner />` 를 **스크롤 컨테이너 하단(CTA 아래)** 에 1개 배치해 히어로 금액·CTA와 겹치지 않음(레이아웃 테스트 또는 스크린샷 확인 기록)
  - `calculate()`가 `TypeError`/`RangeError`를 던지면 화이트 스크린 대신 `"계산할 수 없는 입력이에요"` + 홈 버튼 렌더
  - 이 파일에서 `VITE_TOSS_AD_*` 직접 참조 0건(광고 식별자는 `ResultBanner`가 캡슐화)
- **Covers:** [F4 AC-1, F4 AC-2, F4 AC-6]
- **Files:** `src/pages/ResultPage.tsx`, `src/pages/__tests__/ResultPage.test.tsx`
- **Depends on:** Task 2.1, Task 3.3, Task 3.4, Task 3.5

### Task 3.7 `/history` 목록 · 유형 필터 · 윈도잉 · 미지 타입 폴백
- **Description:** 저장된 레코드 목록 화면. 정렬·필터·윈도잉·빈 상태·미지 `eventType` 라벨 폴백까지 이 패킷에서 마무리한다.
- **DoD:**
  - 정렬: `eventDate` 내림차순, 동일 날짜는 `createdAt` 내림차순(혼합 픽스처 순서 검증)
  - 각 행이 `ListRow` 1개, 좌측 유형 라벨 / 우측 `amount`(`#,###원`)
  - 상단 필터(Chip 또는 Tab)로 유형 선택 시 해당 `eventType`만 남고 건수 표시 즉시 갱신. "전체" 선택 시 해제
  - 500건 픽스처 최초 페인트 DOM 행 수 ≤ 30, 스크롤 시 추가 로드. 진입~첫 렌더 로컬 측정 < 400ms(측정값 테스트 로그 기록)
  - 레코드 0건이면 빈 상태(일러스트 + `"첫 기록을 남겨보세요"` + `/` 이동 버튼) 렌더 + **필터 Chip 숨김**(Chip 노드 0개)
  - `EVENT_TYPES`에 없는 `eventType`(`'PROMOTION'`, `'???'`)은 목록·필터 라벨이 **"기타"**로 렌더. `undefined` 문자열 노출 0건, 빈 행 0건, 크래시 0건
  - 렌더 후 records JSON 문자열이 진입 전과 바이트 동일(읽기 전용)
  - `src/lib/labels.ts`에 `toEventLabel(v: StoredEventType)` / `toRelationLabel(v: StoredRelation)` 폴백 헬퍼를 분리해 상세 화면과 공유(**이 패킷이 labels.ts 유일 소유자**)
- **Covers:** [F5 AC-1, F5 AC-2, F5 AC-3, F5 AC-7, F5 AC-9]
- **Files:** `src/pages/HistoryPage.tsx`, `src/lib/labels.ts`, `src/pages/__tests__/HistoryPage.test.tsx`
- **Depends on:** Task 2.6

### Task 3.8 `/history/:id` 상세 · 삭제 확인 · 다시 계산
- **Description:** 레코드 상세 표시, 삭제(확인 다이얼로그), 재계산/갱신을 구현한다. 미지 `eventType` 재계산 차단 포함. 3.7이 만든 `labels.ts`는 import만 한다.
- **DoD:**
  - `useParams`의 `id`로 조회. **없는 `id`면 크래시 대신 `"기록을 찾을 수 없어요"` + `/history` 이동 버튼 렌더**(잘못된 URL 직접 진입 테스트)
  - `location.state`는 `(useLocation().state as RouteState['/history/:id']) ?? null` 로 받고, **state 없이 직접 진입해도 정상 렌더된다**(테스트)
  - 상세에 `eventType`, `relation`, `amount`, `recommendedAmount`, `attended`, `companions`, `eventDate`, `memo`, `createdAt` 9개 항목 전부 표시(`memo` 부재 시 `"-"`, `undefined` 노출 0건)
  - "삭제" → `AlertDialog` 확인 단계. 확인 시에만 해당 1건 제거, 나머지 건수 불변. **취소 시 저장소 JSON 바이트 동일**
  - "다시 계산" → 현재 `RULE_VERSION` 재계산 값과 저장된 `recommendedAmount`를 나란히 표시. "갱신" 확인 시 `recommendedAmount`, `ruleVersion`, `updatedAt`만 변경되고 `amount`, `id`, `createdAt`은 문자 단위 동일
  - 미지 `eventType`/`relation` 레코드 재계산 시도 → `TypeError`를 잡아 `"이 기록은 현재 버전에서 다시 계산할 수 없어요"` 안내 + **저장소 미변경**(호출 전후 JSON 동일)
  - 삭제/갱신 실패 코드 반환 시 낙관적 변경 롤백 + Toast `"처리하지 못했어요. 다시 시도해 주세요."`. 롤백 후 화면 목록과 저장소 내용 일치
- **Covers:** [F5 AC-4, F5 AC-5, F5 AC-6, F5 AC-8, F5 AC-9]
- **Files:** `src/pages/HistoryDetailPage.tsx`, `src/pages/__tests__/HistoryDetailPage.test.tsx`
- **Depends on:** Task 3.7, Task 2.1

### Task 3.9 통계 상세 차트 컴포넌트 `StatsDetail` (MiniBar · Sparkline)
- **Description:** `aggregate()` 결과를 받아 월별 MiniBar와 유형별 Sparkline을 그리는 순수 표현 컴포넌트. 광고·저장소 의존 0.
- **DoD:**
  - props는 `{ stats: ReturnType<typeof aggregate> }` 하나. 저장소·SDK import 0건
  - `monthly` 배열로 MiniBar 렌더: 막대 개수 === `monthly.length`, 최대값 막대 높이 100% 기준 비율 계산(0으로 나누기 시 `NaN`/`Infinity` 스타일 0건 — `monthly` 전부 0인 픽스처 테스트)
  - `byEventType` 키로 Sparkline/라벨 렌더 시 `labels.ts`의 폴백 라벨 사용 → 미지 키는 **"기타"** 표기, `undefined` 노출 0건
  - `stats.totalCount === 0` 또는 빈 배열이 들어와도 크래시 0건(빈 차트 자리표시자 렌더)
  - SVG/CSS flex·grid만 사용, TDS 컴포넌트에 padding/margin 인라인 지정 0건
  - 최소 폭 320px에서 가로 스크롤 0건
- **Covers:** [F6 AC-1]
- **Files:** `src/components/StatsDetail.tsx`, `src/components/__tests__/StatsDetail.test.tsx`
- **Depends on:** Task 2.5, Task 3.7

### Task 3.10 리워드 게이트 컴포넌트 `RewardGate` (슬롯 ID · 시각 클램프 · env 폴백)
- **Description:** children을 리워드 광고로 감싸 잠금/해제를 관리하는 독립 컴포넌트. **리워드 슬롯 ID(`VITE_TOSS_AD_SLOT_ID`)** 만 사용하며 배너 광고 그룹 ID와 교차 사용 금지.
- **DoD:**
  - `isUnlocked(Date.now(), getReward())`가 `true`면 children을 게이트 없이 즉시 렌더. `false`면 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 감싼 잠금 상태
  - `TossRewardAd`에 전달된 prop이 `VITE_TOSS_AD_SLOT_ID`임을 검증하는 테스트 존재. 이 파일에서 `VITE_TOSS_AD_GROUP_ID` 참조 0건(소스 스캔)
  - 시청 완료 시 `setRewardUnlockedNow()` 저장 + **화면 새로고침 없이** children 즉시 렌더(내부 state 갱신, `location.reload` 호출 0건)
  - 광고 로드/표시 실패 시: 게이트 영역에 `"광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."` + 재시도 버튼. 화이트 스크린/크래시 0건, `lastUnlockedAt` 미갱신(저장소 값 동일 검증). **부모가 렌더한 요약 영역에는 영향 없음**(에러가 상위로 전파되지 않음)
  - 중도 종료 시 `lastUnlockedAt` 미갱신 + 잠금 유지 + 재시도 버튼 재활성화
  - `lastUnlockedAt`이 미래 시각이어도 크래시 0건 + 남은 시간 표기에 `-` 문자 미포함(`Math.max(0, …)` 클램프). `NaN`/`undefined`면 게이트 노출
  - env를 `''`(및 `undefined`)로 stub → `TossRewardAd` 노드 0개 + **children을 게이트 없이 그대로 렌더**(광고 불가 시 기능 영구 차단 금지) + 크래시 0건
- **Covers:** [F6 AC-3, F6 AC-4, F6 AC-5, F6 AC-6, F6 AC-7, F6 AC-9]
- **Files:** `src/components/RewardGate.tsx`, `src/components/__tests__/RewardGate.test.tsx`
- **Depends on:** Task 2.4

### Task 3.11 `/stats` 화면 조립 — 요약 카드 · 빈 상태
- **Description:** `aggregate()` 결과로 요약 카드를 렌더하고 `<RewardGate><StatsDetail /></RewardGate>` 를 조립한다. **이 패킷이 `StatsPage.tsx`의 유일한 소유자다.**
- **DoD:**
  - 요약 카드에 총 건수, 총 지출액(`#,###원`), 건당 평균 3개 값 표시. 화면 평균값 === `Math.round(totalAmount / totalCount)`(값 대조 테스트)
  - 레코드 0건이면 통계 대신 빈 상태 렌더 + **`RewardGate`/`TossRewardAd` 노드 0개**(가치 없는 광고 시청 방지 — DOM 검증)
  - 레코드 1건 이상이면 `<RewardGate>` 로 감싼 `<StatsDetail>` 이 정확히 1회 렌더
  - TDS `ListRow`/`Paragraph.Text`/`Spacing`만 사용, padding/margin 인라인 지정 0건
  - 이 파일에서 `VITE_TOSS_AD_*` 직접 참조 0건(식별자는 `RewardGate`가 캡슐화)
  - 최소 폭 320px 뷰포트에서 가로 스크롤 0건
- **Covers:** [F6 AC-2, F6 AC-8]
- **Files:** `src/pages/StatsPage.tsx`, `src/pages/__tests__/StatsPage.test.tsx`
- **Depends on:** Task 3.9, Task 3.10, Task 2.6

---

## Epic 4. 통합 + 검수 대응

> **파일 충돌 제거:** `src/App.tsx`는 **Task 4.3만** 수정한다. 4.1은 `router.tsx`/`NotFoundPage.tsx`/`AppLayout.tsx`만, 4.2는 `OnboardingDialog.tsx`/`ErrorBoundary.tsx`만 소유한다.

**Risk Assessment**
- **Complexity:** Medium
- **Risk factors:**
  - 라우팅 와이어링을 마지막에 하면 각 페이지가 서로 다른 state 계약을 써 통합 시점에 대량 수정 발생
  - 검수 정적 검증(F8 AC-6/7/8/10)을 마지막에만 돌리면 위반이 화면 전반에 흩어져 수정 비용 폭증 → 검수 반려 리스크
  - 하단 네비를 TDS `Tab`으로 잘못 구현하면 F8 AC-2 소스 스캔 실패
  - 에러 바운더리 부재 시 단일 렌더 예외가 앱 전체 화이트 스크린으로 확대
  - 앱 셸 파일(App.tsx)을 여러 패킷이 편집하면 Provider 중복 마운트/누락 발생(이번 수정으로 제거)
- **Mitigation:** RouteState를 Task 1.1에서 선계약해 각 페이지가 통합 전 동일 state 형태를 사용. 정적 검증 규칙(4.4)은 Epic 3의 각 패킷 DoD에 "import 0건 / padding 인라인 0건" 형태로 미리 분산 포함시켜 4.4는 자동화 확인에 그치게 함. 셸 컴포넌트(4.2)를 App 조립(4.3)보다 앞에 두어 통합 시 크래시가 러너 전체를 멈추지 않게 함.

### Task 4.1 라우터 정의 + FloatingTabBar 레이아웃 + NotFound
- **Description:** `react-router-dom` 라우트 6개와 하단 네비게이션 레이아웃, NotFound 화면을 만든다. App 마운트는 다음다음 패킷에서 수행하고, 이 패킷은 `<RouterProvider router={router} />` 로 자체 테스트한다.
- **DoD:**
  - `src/router.tsx`에 라우트가 정확히 `/`(계산), `/result`, `/history`, `/history/:id`, `/stats`, `*`(NotFound) **6개**. 각 경로 직접 진입 시 해당 화면 렌더(6케이스 테스트)
  - 공유 카드는 별도 라우트가 아니라 결과 화면 내 시트(`ShareCardSheet`)로 처리되어 라우트 개수 계약 유지(스캔: 라우트 정의 배열 길이 === 6)
  - 하단 네비를 `src/components/AppLayout.tsx`에서 템플릿 제공 `src/components/FloatingTabBar` 로 구현, 탭은 계산·기록·통계 3개. 소스 스캔: 자체 구현 `TabBar` 정의 0건, TDS `Tab`을 하단 네비로 사용한 코드 0건
  - 미정의 경로 진입 → `NotFoundPage`(홈 이동 버튼 포함) 렌더. 빈 화면 0건, 리다이렉트 루프 0건(연속 5회 렌더 내 경로 안정화 테스트)
  - 소스 스캔: 모든 페이지가 `useLocation().state` 사용 시 `?? null` + null 체크를 거치며, `useLocation().state as X` 뒤 즉시 구조분해 패턴 0건
- **Covers:** [F8 AC-1, F8 AC-2, F8 AC-5]
- **Files:** `src/router.tsx`, `src/components/AppLayout.tsx`, `src/pages/NotFoundPage.tsx`, `src/__tests__/router.test.tsx`
- **Depends on:** Task 3.2, Task 3.6, Task 3.7, Task 3.8, Task 3.11

### Task 4.2 온보딩 다이얼로그 + 에러 바운더리 컴포넌트
- **Description:** 첫 진입 고지 다이얼로그와 전역 에러 바운더리를 **독립 컴포넌트 파일**로 구현한다(App 조립은 4.3).
- **DoD:**
  - `OnboardingDialog`: `isOnboarded()`가 `false`면 마운트 시 **정확히 1회** 노출, `true`면 노드 0개
  - 본문에 문자열 `"참고용 기준값"` 포함(정확 문자열 매칭 테스트)
  - 닫으면 `markOnboarded()` 호출되어 키가 `'1'`로 저장되고, 재마운트 시 다이얼로그 노드 0개
  - 저장 실패(`QUOTA_EXCEEDED`) 시에도 다이얼로그는 정상적으로 닫히고 크래시 0건
  - `ErrorBoundary`: 하위 렌더 예외를 잡아 `"일시적인 오류가 발생했어요"` + "홈으로" 버튼 렌더. 테스트: 렌더 시 throw하는 자식 주입 → 흰 화면 대신 폴백 UI + "홈으로" 클릭 시 `/`로 이동
  - 두 컴포넌트 모두 TDS 사용, padding/margin 인라인 지정 0건
- **Covers:** [F8 AC-3, F8 AC-4]
- **Files:** `src/components/OnboardingDialog.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/__tests__/OnboardingDialog.test.tsx`, `src/components/__tests__/ErrorBoundary.test.tsx`
- **Depends on:** Task 2.4

### Task 4.3 앱 셸 조립 (`App.tsx` 단독 소유)
- **Description:** `RecordsProvider` → `ErrorBoundary` → `RouterProvider` → `OnboardingDialog` 순으로 앱 루트를 조립한다. **이 패킷이 `src/App.tsx`를 수정하는 유일한 패킷이다.**
- **DoD:**
  - `RecordsProvider`가 라우터 상위에 **1회만** 마운트(중복 Provider 노드 0개 테스트)
  - `ErrorBoundary`가 라우터 전체를 감싸 **어떤 경로에서도 화이트 스크린이 발생하지 않는다** — 6개 라우트 각각에서 throw하는 자식을 주입해 폴백 UI 렌더 확인(6케이스)
  - `OnboardingDialog`가 앱 루트에 1회 마운트되어 첫 진입 시 1회 노출, 닫은 뒤 재진입(재마운트) 시 노드 0개
  - `vite build` 및 `tsc --noEmit` 통과, 실제 기기/시뮬레이터에서 3개 탭 이동이 모두 동작함을 확인 기록
  - 이 패킷 이후 Epic 4의 나머지 패킷은 `App.tsx`를 수정하지 않는다
- **Covers:** [F8 AC-3, F8 AC-4]
- **Files:** `src/App.tsx`, `src/__tests__/App.integration.test.tsx`
- **Depends on:** Task 4.1, Task 4.2

### Task 4.4 검수 정적 검증 — 금지 라이브러리 · 광고 식별자 매핑 · SDK API · AI 미사용
- **Description:** CI에서 실패 시 빌드를 차단하는 소스 스캔 테스트 묶음을 작성한다. 위반 발견 시 해당 파일을 즉시 수정한다(수정 대상은 위반 파일에 한정).
- **DoD:**
  - 스캔 ①: `src/**`에서 `shadcn`, `@mui/`, `antd`, `@chakra-ui/` import 0건. TDS 컴포넌트 JSX의 `className`/`style`에 `padding|margin|gap` 지정 0건(위반 시 파일·라인 출력 후 실패)
  - 스캔 ②: 광고/IAP 식별자가 `import.meta.env.VITE_TOSS_AD_GROUP_ID` / `VITE_TOSS_AD_SLOT_ID` / `VITE_TOSS_IAP_SKU`로만 참조됨. ID 형태 리터럴 하드코딩 0건. **`AdSlot` JSX의 `adGroupId` prop 값이 `VITE_TOSS_AD_GROUP_ID` 이외인 경우 0건, `TossRewardAd` JSX의 `slotId` prop 값이 `VITE_TOSS_AD_SLOT_ID` 이외인 경우 0건**(교차 사용 시 CI 실패)
  - 스캔 ③: `useTossAd`, `loadAdMob`, `showAdMob`, `login(`, `signIn(` 출현 0건
  - 스캔 ④: `anthropic`, `openai`, `generativelanguage`, `/v1/messages`, `/v1/chat/completions` 출현 0건 + `src/domain/`이 F2 AC-1 결정론 스캔 통과. 생성형 AI 사전 고지 UI를 두지 않음을 문서에 기록
  - 네 스캔이 `npm test`에 포함되고 하나라도 실패 시 종료 코드 ≠ 0
- **Covers:** [F8 AC-6, F8 AC-7, F8 AC-8, F8 AC-10]
- **Files:** `src/__tests__/compliance.scan.test.ts`, `package.json`
- **Depends on:** Task 4.3

### Task 4.5 `.env.example` 문서화 + 접근성 체크리스트
- **Description:** 환경변수 문서 파일과 CI 검증을 추가하고, 주요 5개 화면의 터치 타깃·대비 수동 체크 결과를 기록한다.
- **DoD:**
  - 루트 `.env.example`에 `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`, `VITE_TOSS_IAP_SKU` 3개 키 존재, 값은 비어 있음
  - 각 키 바로 위에 §1.6 용도 주석 1줄 이상(배너 = 광고 그룹 단위 / 리워드 = 슬롯 단위 / IAP = SKU)
  - CI 테스트가 3개 키 존재 + 각 키 직전 줄이 `#`로 시작함을 검증, 위반 시 실패
  - `docs/a11y-checklist.md`에 5개 화면(`/`, `/result`, `/history`, `/history/:id`, `/stats`)별로 ①모든 인터랙티브 요소 터치 타깃 ≥ 44×44 px ②본문 텍스트 명도 대비 ≥ 4.5:1 의 Pass/Fail과 측정값 기록. Fail 항목 0건
  - 320px 폭에서 5개 화면 모두 가로 스크롤 0건 확인 기록
- **Covers:** [F8 AC-9, F8 AC-11, F3 AC-7]
- **Files:** `.env.example`, `src/__tests__/env-example.test.ts`, `docs/a11y-checklist.md`
- **Depends on:** Task 4.4

---

## 파일 소유권 표 (충돌 0건 검증)

| 파일 | 소유 Task | 후행 패킷 관계 |
|---|---|---|
| `src/domain/types.ts`, `src/lib/types.ts` | 1.1 | import만 |
| `src/domain/rules.ts`, `src/storage/keys.ts` | 1.2 | import만 |
| `src/domain/calculate.ts` (+테스트) | 2.1 | import만 |
| `src/storage/envelope.ts`, `migrations.ts`, `uuid.ts` | 2.2 | import만 |
| `src/storage/records.ts` | 2.3 | import만 |
| `src/storage/settings.ts`, `reward.ts`, `onboard.ts` | 2.4 | import만 |
| `src/domain/aggregate.ts` | 2.5 | import만 |
| `src/state/RecordsContext.tsx` | 2.6 | import만 |
| `src/components/CalculateForm.tsx` | 3.1 | 3.2가 조립 |
| **`src/pages/CalculatePage.tsx`** | **3.2 단독** | — |
| `src/components/SaveRecordSheet.tsx` | 3.3 | 3.6이 조립 |
| `src/components/ResultBanner.tsx` | 3.4 | 3.6이 조립 |
| `src/lib/renderShareCard.ts`, `src/components/ShareCardSheet.tsx` | 3.5 | 3.6이 조립 |
| **`src/pages/ResultPage.tsx`** | **3.6 단독** | — |
| `src/pages/HistoryPage.tsx`, `src/lib/labels.ts` | 3.7 | 3.8·3.9가 import |
| `src/pages/HistoryDetailPage.tsx` | 3.8 | — |
| `src/components/StatsDetail.tsx` | 3.9 | 3.11이 조립 |
| `src/components/RewardGate.tsx` | 3.10 | 3.11이 조립 |
| **`src/pages/StatsPage.tsx`** | **3.11 단독** | — |
| `src/router.tsx`, `src/components/AppLayout.tsx`, `src/pages/NotFoundPage.tsx` | 4.1 | 4.3이 조립 |
| `src/components/OnboardingDialog.tsx`, `ErrorBoundary.tsx` | 4.2 | 4.3이 조립 |
| **`src/App.tsx`** | **4.3 단독** | — |
| `src/__tests__/compliance.scan.test.ts`, `package.json` | 4.4 | — |
| `.env.example`, `docs/a11y-checklist.md`, `src/__tests__/env-example.test.ts` | 4.5 | — |

**중복 소유 파일: 0건** (검증 오류 4건 모두 해소 — CalculatePage 3.1→컴포넌트 분리 / ResultPage 3.3·3.4·3.5→컴포넌트 분리 / StatsPage 3.9·3.10→컴포넌트 분리 / App.tsx 4.1·4.2→4.3 단독 조립)

---

## AC Coverage

- **Total ACs in SPEC: 64** (F1 8 + F2 7 + F3 7 + F4 8 + F5 9 + F6 9 + F7 5 + F8 11)
- **Covered by tasks: 64**

| Feature | AC | 담당 Task |
|---|---|---|
| F1 | AC-1, AC-2, AC-3, AC-4 | Task 2.3 |
| F1 | AC-5, AC-6, AC-7, AC-8 | Task 2.2 |
| F2 | AC-1 ~ AC-7 | Task 2.1 (AC-2 타입·상수 선행: Task 1.1 / 1.2) |
| F3 | AC-1, AC-2, AC-5, AC-7 | Task 3.1 (AC-7 재검증: Task 4.5) |
| F3 | AC-3, AC-4, AC-6 | Task 3.2 |
| F4 | AC-1, AC-6 | Task 3.6 |
| F4 | AC-2 | Task 3.4(식별자·env) + Task 3.6(배치) |
| F4 | AC-3, AC-4, AC-5, AC-7 | Task 3.3 |
| F4 | AC-8 | Task 3.4 |
| F5 | AC-1, AC-2, AC-3, AC-7, AC-9 | Task 3.7 |
| F5 | AC-4, AC-5, AC-6, AC-9 | Task 3.8 |
| F5 | AC-8 | Task 2.6(롤백 기반) + Task 3.8(화면 검증) |
| F6 | AC-1 | Task 2.5(집계 함수) + Task 3.9(렌더) |
| F6 | AC-2, AC-8 | Task 3.11 |
| F6 | AC-3, AC-4, AC-5, AC-6, AC-9 | Task 3.10 |
| F6 | AC-7 | Task 2.4(클램프 헬퍼) + Task 3.10(UI 검증) |
| F7 | AC-1 ~ AC-5 | Task 3.5 |
| F8 | AC-1, AC-2, AC-5 | Task 4.1 |
| F8 | AC-3, AC-4 | Task 4.2(컴포넌트) + Task 4.3(통합) |
| F8 | AC-6, AC-7, AC-8, AC-10 | Task 4.4 |
| F8 | AC-9, AC-11 | Task 4.5 |

- **Uncovered: 0**

---

### 추가 안전 계약 (전 패킷 공통 — 각 DoD에 반영됨)

`location.state`를 수신하는 모든 화면(`/result`, `/history/:id`, `/`의 prefill)은 다음을 만족한다:

> **state 없이 해당 경로로 직접 진입(새로고침·딥링크)해도 크래시하지 않고, 홈으로 `replace` 리다이렉트하거나 안전한 빈 상태를 렌더한다.**

금지 패턴(Task 4.1 소스 스캔 대상):
- `const { x } = useLocation().state as X;`
- `(useLocation().state as X).items.map(...)`

필수 패턴:
```tsx
const state = (useLocation().state as RouteState['/result']) ?? null;
if (!state) return <Navigate to="/" replace />;
```