# TASK

> ⚠️ 전제: 수신된 SPEC은 **S4(히스토리 목록) 중간부터 시작하는 발췌본**입니다. 발췌본에 명시된 AC ID(F1 AC-5·6·9~13, F3 AC-9, F5 AC-4·7·10~13, F8 AC-5·8~12, AC-G9)와 화면 계약(S4~S8)은 원문 그대로 매핑했고, **텍스트가 수신되지 않은 AC 구간(F1 AC-1~4·7·8, F2/F4/F6/F7 전체, F3 AC-1~8, F5 AC-1~3·5·6·8·9, F8 AC-1~4·6·7, AC-G1~G8)** 은 Work Packet Mapping 표의 패킷 단위로 기능 전체를 담당 태스크에 귀속시켰습니다. 구현 착수 전 원문 AC 표를 담당 태스크의 `Covers`에 치환해 주세요.

---

## Epic 1. 타입 + 오류 계약 (런타임 코드 없음/최소)

**Risk Assessment**
- Complexity: **Low**
- Risk factors: `RouteState`가 늦게 정의되면 각 페이지가 제각각 `location.state`를 캐스팅해 `/share`·`/history` 간 필드명 불일치(예: `result` vs `calcResult`) 발생. `AppErrorCode`가 분산 정의되면 AC-G9(오류 문구 단일 소스) 위반.
- Mitigation: 모든 페이지·스토리지 태스크가 Epic 1에 `Depends on`으로 묶여 있어, 타입·문구가 확정되기 전에는 어떤 화면도 작성될 수 없다.

### Task 1.1 도메인 타입 · AppErrorCode · RouteState 정의
- **Description**: 앱 전체 엔티티와 화면 간 이동 계약을 순수 타입으로 선언한다. 런타임 코드(함수/상수) 0줄.
- **DoD**:
  - `src/lib/types.ts`에 다음이 export 된다:
    - `EventType = 'wedding' | 'funeral' | 'firstBirthday' | 'etc'`
    - `Relationship`(친밀도 등급 문자열 유니온), `Region`(문자열 유니온)
    - `CalcInput = { eventType; relationship; region; attend: boolean; inflationAdjust: boolean }`
    - `CalcResult = { recommendedAmount: number; rangeMin: number; rangeMax: number; reasons: string[] }`
    - `GiftRecord = { id: string; personName: string; eventType: EventType; relationship: Relationship; eventDate: string /* YYYY-MM-DD */; amount: number; memo?: string; createdAt: number; updatedAt: number }`
    - `AppSettings = { defaultRegion: Region; inflationAdjustDefault: boolean; rewardUnlockedUntil: number | null }`
    - `AppErrorCode = 401 | 403 | 404 | 409 | 413 | 416 | 422 | 500 | 507`
    - `Result<T> = { ok: true; data: T } | { ok: false; code: AppErrorCode; error: string }`
    - `RouteState` 매핑 타입(아래 6개 키 전부 포함):
      ```ts
      export type RouteState = {
        "/": undefined;
        "/calc": { prefill?: Partial<CalcInput> } | undefined;
        "/result": { input: CalcInput } | undefined;
        "/history": { prefill: (CalcInput & { recommendedAmount: number }) | null } | undefined;
        "/share": { input: CalcInput; result: CalcResult } | undefined;
        "/settings": undefined;
      };
      ```
  - `npx tsc --noEmit` 종료 코드 0.
  - 파일 내 `function`/`const` 선언이 0개(타입·인터페이스만).
- **Covers**: [Data Models(AppErrorCode/Result 타입, 변경이력 #15), S4~S8 Navigation state contract, F1 기반 타입]
- **Files**: `src/lib/types.ts`
- **Depends on**: none

### Task 1.2 오류 문구 단일 소스(errors.ts)
- **Description**: `AppErrorCode` → 사용자 노출 문구를 1개 파일에 격리한다. UI에는 코드 숫자를 절대 노출하지 않는다(Assumption 10).
- **DoD**:
  - `src/lib/errors.ts`가 `ERROR_MESSAGES: Record<AppErrorCode, string>`와 `fail(code): Result<never>`, `ok<T>(data): Result<T>` 헬퍼를 export.
  - 문구는 SPEC 원문과 문자 단위 일치: 409(동시수정)="다른 화면에서 이미 수정된 기록이에요. 새로고침 후 다시 시도해주세요", 404="삭제되었거나 없는 기록이에요", 500(광고)="광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요", 401="토스 앱에서 광고를 보면 상세 리포트를 열 수 있어요", 416="모든 기록을 다 봤어요".
  - 테스트 `src/lib/errors.test.ts`: `Object.keys(ERROR_MESSAGES).length === 9`이고 모든 값이 빈 문자열이 아니며 `/[0-9]{3}/` 패턴(코드 숫자)을 포함하지 않는다 → 통과.
  - `grep -rn "잠시 후 다시 시도" src/pages src/components` 결과 0건(문구 하드코딩 금지)을 CI 스크립트 `scripts/check-error-source.mjs`로 검증, 종료 코드 0.
- **Covers**: [AC-G9, F1 AC-5/AC-6 문구, Error Model 표]
- **Files**: `src/lib/errors.ts`, `src/lib/errors.test.ts`, `scripts/check-error-source.mjs`
- **Depends on**: Task 1.1

---

## Epic 2. 데이터 계층 (localStorage → 도메인 로직 → 상태)

**Risk Assessment**
- Complexity: **High**
- Risk factors: (a) localStorage 5MB 한도 — 레코드 1,000건/413·507 처리 누락 시 저장 무음 실패. (b) 낙관적 잠금 키가 `updatedAt`(epoch ms)이라 동일 ms 연속 수정 시 충돌 미감지. (c) `subscribeRecords`의 `storage` 이벤트는 **같은 탭에서 발화하지 않음** → 자기 탭 갱신 누락으로 UI 정체. (d) 스토리지 접근이 여러 파일로 새어나가면 403 정적 검증(F8 AC-11) 실패.
- Mitigation: 2.1(순수 CRUD+한도) → 2.2(충돌/중복/구독) → 2.3(설정) 순서로 쪼개, 페이지가 만들어지기 전에 모든 오류 코드 경로가 단위 테스트로 고정된다. 스토리지 접근은 2.1에서 `src/lib/storage.ts` 단일 파일로 봉인하고 2.1 DoD에 grep 검증을 포함한다. (c)는 2.2에서 자체 이벤트 버스 병행 발행으로 해소.

### Task 2.1 localStorage CRUD 기반 모듈 (키 격리 · 413 · 507)
- **Description**: `gmc:` 네임스페이스 단일 접근 지점을 만들고 읽기/쓰기/한도 검사를 구현한다.
- **DoD**:
  - `src/lib/storage.ts`가 `readRecords(): GiftRecord[]`, `writeRecords(rs): Result<void>`, `readSettings(): AppSettings`, `writeSettings(s): Result<void>`, `clearAll(): Result<void>` export.
  - 사용 키는 `gmc:records`, `gmc:settings` 2개뿐. `grep -rn "localStorage" src --include=*.ts --include=*.tsx | grep -v "src/lib/storage.ts"` 결과 **0건**.
  - 레코드 1,001건째 저장 시도 → `{ ok:false, code:413 }` 반환, 기존 저장값 불변.
  - `setItem`이 `QuotaExceededError`를 throw하도록 모킹 → `{ ok:false, code:507 }` 반환, 기존 저장값 불변.
  - JSON 파싱 실패 시 throw 없이 빈 배열/기본 설정 반환.
  - `src/lib/storage.test.ts` 5케이스(정상 R/W, 413, 507, 파싱 깨짐, clearAll) 전부 통과.
- **Covers**: [F1 AC-1~AC-4(저장/조회/삭제 기본), F1 AC-5(413), F1 AC-6(507), F1 AC-7·AC-8, F8 AC-11(403 격리 전제)]
- **Files**: `src/lib/storage.ts`, `src/lib/storage.test.ts`
- **Depends on**: Task 1.1, Task 1.2

### Task 2.2 레코드 도메인 연산 (ID 409 · 중복 409 · 낙관적 잠금 409 · 404 · subscribeRecords)
- **Description**: 2.1 위에 레코드 생성/수정/삭제 규칙과 변경 구독을 얹는다.
- **DoD**:
  - `src/lib/records.ts`가 `createRecord(input, opts?: { force?: boolean }): Result<GiftRecord>`, `updateRecord(id, patch, baseUpdatedAt): Result<GiftRecord>`, `deleteRecord(id): Result<void>`, `subscribeRecords(cb): () => void` export.
  - ID는 `crypto.randomUUID()` 사용, 기존 ID와 충돌 시 최대 3회 재생성 후 실패하면 `{ ok:false, code:409 }`.
  - `personName|eventDate|eventType` 동일 레코드가 이미 있으면 `{ ok:false, code:409 }`; 동일 호출에 `{ force: true }` 전달 시 **저장 성공**하고 두 레코드가 공존(Assumption 13).
  - `updateRecord`의 `baseUpdatedAt`이 저장된 `updatedAt`과 다르면 `{ ok:false, code:409 }`, 저장값 불변.
  - 존재하지 않는 `id`로 update/delete → `{ ok:false, code:404 }`.
  - `subscribeRecords` 콜백이 (i) 다른 탭의 `storage` 이벤트, (ii) 같은 탭의 create/update/delete 양쪽 모두에서 호출된다(테스트 2케이스). 반환된 unsubscribe 호출 후에는 호출 0회.
  - `src/lib/records.test.ts` 8케이스 통과.
- **Covers**: [F1 AC-9(ID 409), F1 AC-10(중복 409), F1 AC-11(낙관적 잠금 409), F1 AC-12(404), F1 AC-13(구독)]
- **Files**: `src/lib/records.ts`, `src/lib/records.test.ts`
- **Depends on**: Task 2.1

### Task 2.3 설정 저장 계층 (확인 후 반영 · 리워드 해제 상태)
- **Description**: 설정 읽기/쓰기와 리워드 24시간 해제 플래그를 순수 함수로 제공한다. 낙관적 UI 업데이트 금지(Assumption 15).
- **DoD**:
  - `src/lib/settings.ts`가 `getSettings()`, `saveSettings(partial): Result<AppSettings>`, `unlockReward(now): Result<AppSettings>`, `isRewardUnlocked(now): boolean` export.
  - `saveSettings` 성공 시에만 갱신된 전체 설정 객체를 반환하고, 실패 시 `{ ok:false, code:500|507 }`이며 `getSettings()`가 **이전 값과 완전히 동일**함을 테스트로 검증.
  - `unlockReward(t)` 후 `rewardUnlockedUntil === t + 86_400_000`, `isRewardUnlocked(t + 86_399_999) === true`, `isRewardUnlocked(t + 86_400_001) === false`.
  - 잘못된 `region` 값(유니온 밖 문자열)을 저장 시도 → `{ ok:false, code:422 }`이고 저장값 불변.
  - `src/lib/settings.test.ts` 6케이스 통과.
- **Covers**: [F8 AC-5(저장 실패 롤백), F8 AC-12(확인 후 반영), F3 AC-9(422 무효 region 대체 전제), F4 리워드 해제 상태(Assumption 3, Open Q2 단일 플래그)]
- **Files**: `src/lib/settings.ts`, `src/lib/settings.test.ts`
- **Depends on**: Task 2.1

### Task 2.4 계산 엔진 (rules.ts + calc.ts)
- **Description**: 기준표 상수를 1파일에 격리하고 결정론 계산 함수를 구현한다(Assumption 1·2).
- **DoD**:
  - `src/lib/rules.ts`: 행사유형×관계 기준 금액표(3만/5만/10만 단위), 참석 여부 배수, 지역 보정 계수, 물가 보정 계수를 **상수만** export. 함수 0개.
  - `src/lib/calc.ts`: `calculate(input: CalcInput): CalcResult` — 동일 입력 100회 호출 시 결과 100회 동일(결정론 테스트).
  - 결과 금액은 항상 10,000원 단위로 반올림되고 `rangeMin <= recommendedAmount <= rangeMax`.
  - `reasons` 배열 길이 ≥ 2(적용된 보정 근거 문자열).
  - `src/lib/calc.test.ts`: 행사유형 4종 × 관계 등급 전체 테이블 테스트가 스냅샷 없이 명시 기대값으로 통과.
  - `Math.random`/`Date.now` 사용 0건(grep 검증).
- **Covers**: [F2 전체(계산 엔진 패킷 1개), Assumption 2(상수 1파일 격리)]
- **Files**: `src/lib/rules.ts`, `src/lib/calc.ts`, `src/lib/calc.test.ts`
- **Depends on**: Task 1.1

### Task 2.5 통계 집계 함수
- **Description**: 레코드 배열 → 통계 화면이 쓰는 집계 결과를 순수 함수로 만든다(렌더 없음).
- **DoD**:
  - `src/lib/stats.ts`가 `aggregate(records, now): StatsSummary` export. `StatsSummary`는 `types.ts`에 추가: `{ totalAmount; count; avgAmount; byEventType: { type; amount; ratio }[]; monthlyTrend: { month: string; amount: number }[]; topRelationship: string | null }`.
  - `records.length === 0` → `totalAmount 0`, `count 0`, `avgAmount 0`, `byEventType []`, `monthlyTrend []`, `topRelationship null` (throw 없음).
  - `byEventType[].ratio` 합계가 0.999~1.001 범위(0건 제외).
  - `monthlyTrend`는 최근 6개월을 **기록이 없는 달도 amount 0으로 포함**해 길이 6 고정.
  - `src/lib/stats.test.ts` 5케이스 통과.
- **Covers**: [F6 집계 부분(패킷 ①의 집계 함수)]
- **Files**: `src/lib/stats.ts`, `src/lib/stats.test.ts`, `src/lib/types.ts`(StatsSummary 추가)
- **Depends on**: Task 1.1, Task 2.2

### Task 2.6 상태 관리 훅 (useRecords · useSettings)
- **Description**: 페이지가 스토리지를 직접 만지지 않도록 구독 연동 훅을 제공한다.
- **DoD**:
  - `src/hooks/useRecords.ts`: `{ records, loading, add, update, remove, refresh }` 반환. 마운트 시 `subscribeRecords` 등록, 언마운트 시 해제(해제 후 setState 호출 0회 — React act 경고 없음).
  - `add/update/remove`는 `Result`를 **그대로 반환**하고, 실패(`ok:false`) 시 내부 `records` state를 변경하지 않는다.
  - `src/hooks/useSettings.ts`: `{ settings, loading, save, unlockReward, saving }` 반환. `save` 진행 중 `saving === true`이고 성공 응답 수신 후에만 `settings`가 바뀐다(확인 후 반영).
  - `src/hooks/useRecords.test.tsx` 4케이스(초기 로드, 다른 탭 이벤트로 재조회, 실패 시 state 불변, 언마운트 해제) 통과.
  - `npx tsc --noEmit` 종료 코드 0.
- **Covers**: [F1 AC-13(구독 소비), F8 AC-12(saving 상태), S6 동기화 계약]
- **Files**: `src/hooks/useRecords.ts`, `src/hooks/useSettings.ts`, `src/hooks/useRecords.test.tsx`
- **Depends on**: Task 2.2, Task 2.3

---

## Epic 3. 핵심 UI 페이지 (1 태스크 = 1 화면/1 관심사)

**Risk Assessment**
- Complexity: **High**
- Risk factors: (a) `location.state` 없이 `/result`·`/share` 직접 진입 시 `as` 캐스팅만 믿으면 런타임 크래시(2026-08-03 SplitMate 사고: 결과 배열 undefined에 `.map()` 호출 → 완주율 0%). (b) TDS 컴포넌트에 Tailwind/인라인 여백을 덮어써 검수 반려. (c) 히스토리 목록 100건 초과 렌더 시 초기 마운트 폭증. (d) BottomSheet/AlertDialog가 탭 이동 후에도 살아남아 body 스크롤 잠금.
- Mitigation: 모든 state 수신 화면 태스크의 DoD에 "state 없이 직접 진입해도 크래시 없이 리다이렉트/빈 상태" AC를 **개별 항목으로 강제**했다. 목록(3.5)과 시트(3.6)를 분리해 윈도잉과 폼 검증이 서로를 밀어내지 않게 했고, 오버레이 수명주기는 Epic 4에서 전역 배선으로 일괄 처리한다.

### Task 3.1 홈 화면 `/`
- **Description**: 진입 화면. 최근 기록 요약과 "경조사비 계산하기" 주 CTA를 배치한다.
- **DoD**:
  - `src/pages/Home.tsx`가 `ScreenScaffold` + `Top` + TDS `Button`(primary, `display="block"`, 높이 ≥ 52px)으로 구성된다.
  - 기록 0건이면 `Asset.ContentIcon` + 안내 문구를 렌더하고, ≥1건이면 최근 3건을 `ListRow`(높이 ≥ 56px)로 렌더.
  - 주 CTA 탭 → `navigate('/calc')` 호출(테스트에서 `useNavigate` 모킹으로 인자 검증).
  - 로딩 중 `Skeleton` 3개 렌더.
  - `Home.tsx` 내 `className="p-`/`m-`/`style={{ padding` 사용 0건(grep 검증).
- **Covers**: [F3 홈 패킷(F3 AC-1~AC-4 상당), S1 레이아웃·터치 계약]
- **Files**: `src/pages/Home.tsx`
- **Depends on**: Task 2.6

### Task 3.2 계산 입력 화면 `/calc`
- **Description**: 행사유형·관계·지역·참석여부·물가보정 입력 폼.
- **DoD**:
  - `src/pages/Calc.tsx`가 `Chip`(행사유형/관계 선택), `Switch`(참석·물가보정), `BottomSheet`(지역 선택), `SubmitFooter`+`Button`(≥ 52px)으로 구성.
  - 지역 초기값은 `useSettings().settings.defaultRegion`. 저장된 region이 유니온 밖 값이면 기본값 `'seoul'`로 대체하고 Toast를 띄우되 **입력 폼은 계속 사용 가능**(F3 AC-9 / 422).
  - 필수 항목 미선택 시 제출 버튼 `disabled`.
  - 제출 → `navigate('/result', { state: { input } satisfies RouteState["/result"] })`.
  - `location.state`가 `{ prefill }`이면 해당 필드가 초기 선택되고, **state가 없어도 크래시 없이 기본값으로 렌더된다**(`const state = (useLocation().state as RouteState["/calc"]) ?? null;`).
  - 금액/날짜성 입력 없음(이 화면은 선택형) — `TextField` 사용 시 `inputMode="numeric"`.
- **Covers**: [F3 입력 폼 패킷(F3 AC-5~AC-8), F3 AC-9(region 보존/422), S2 계약]
- **Files**: `src/pages/Calc.tsx`
- **Depends on**: Task 2.4, Task 2.6

### Task 3.3 결과 화면 `/result` — 기본 레이아웃
- **Description**: 권장 금액과 범위, 근거를 표시한다. 리워드 게이트는 다음 태스크.
- **DoD**:
  - `const state = (useLocation().state as RouteState["/result"]) ?? null; if (!state) return <Navigate to="/" replace />;` 패턴 사용. **`state` 없이 `/result` 직접 진입 시 흰 화면·크래시 없이 `/`로 replace 이동**(테스트 1케이스 필수).
  - `data-testid="result-card"` Card 1개에 권장 금액(t2 이상), 권장 범위, `reasons` 목록(`ListRow`) 렌더.
  - `SubmitFooter`에 "기록에 추가"(→ `navigate('/history', { state: { prefill: { ...input, recommendedAmount } } })`)와 "공유 카드"(→ `navigate('/share', { state: { input, result } })`) 버튼, 각 높이 ≥ 48px.
  - 계산은 `calculate(state.input)` 1회만 호출(`useMemo`).
- **Covers**: [F4 결과 레이아웃 패킷, S3 Navigation state contract, S7/S4 Incoming 계약 발신측]
- **Files**: `src/pages/Result.tsx`
- **Depends on**: Task 2.4, Task 1.1

### Task 3.4 결과 상세 리워드 게이트
- **Description**: 상세 근거 리포트를 `TossRewardAd`로 게이트한다.
- **DoD**:
  - 잠금 상태에서 `data-testid="result-detail"` 내부의 **수치 텍스트가 DOM에 렌더되지 않는다**(`queryByText(/원/)` 결과 null) — 블러 미리보기만 표시.
  - 해제 버튼(높이 ≥ 48px) → `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 시청 완료 시 `unlockReward(Date.now())` 호출 후 상세 렌더.
  - `isRewardUnlocked(Date.now()) === true`면 광고 없이 즉시 상세 표시(24시간 유지).
  - 광고 실패 → `ERROR_MESSAGES[500]` Toast, 상세는 잠금 유지.
  - `VITE_TOSS_AD_SLOT_ID`가 빈 문자열이면 게이트 UI 대신 상세를 그대로 노출하고 레이아웃이 깨지지 않는다(Assumption 6).
- **Covers**: [F4 광고 게이트+상세 리포트 패킷, Assumption 3·6, Open Q2(단일 플래그)]
- **Files**: `src/pages/Result.tsx`, `src/components/RewardGate.tsx`
- **Depends on**: Task 3.3, Task 2.3

### Task 3.5 히스토리 목록 `/history` — 목록 · 필터 · 416
- **Description**: 기간 요약 카드, 행사별 필터 탭, 목록 렌더와 끝 도달 처리.
- **DoD**:
  - `data-testid="history-summary"` Card 1개에 이번 달 총액·건수 표시.
  - 상단 `Tab`은 sticky, 목록 컨테이너만 세로 스크롤.
  - 레코드 100건 이하 → 전량 렌더. 101건 이상 → **초기 마운트 ListRow 개수 ≤ 30**(테스트에서 `getAllByRole('listitem').length <= 30` 검증)(F5 AC-7).
  - `offset`은 항상 `Math.min(Math.max(0, offset), records.length)`로 클램프되고, 끝 도달 시 마지막 항목 아래 "모든 기록을 다 봤어요"가 **정확히 1회** 렌더(F5 AC-11 / 416).
  - Empty: 0건 → `Asset.ContentIcon` + "아직 기록이 없어요" + "기록 추가하기". 필터 결과 0건 → "{행사명} 기록이 없어요".
  - Loading: Skeleton ListRow 5개 + FAB `disabled`.
  - FAB 56×56px, 우하단 고정, `FloatingTabBar` 위 16px 여백. ListRow 높이 ≥ 56px.
  - ListRow 탭 → `navigate('/history/' + record.id)`.
- **Covers**: [F5 목록·필터 패킷(F5 AC-1~AC-3), F5 AC-7(윈도잉), F5 AC-11(416/클램프), S4 레이아웃·상태·터치 계약]
- **Files**: `src/pages/History.tsx`, `src/components/HistoryList.tsx`
- **Depends on**: Task 2.6

### Task 3.6 히스토리 추가·수정 BottomSheet (409 중복 확인 포함)
- **Description**: FAB/prefill로 열리는 입력 시트와 중복 저장 확인 다이얼로그.
- **DoD**:
  - `src/components/RecordSheet.tsx`가 이름(`TextField`), 금액·날짜(`TextField` + `inputMode="numeric"`, 날짜는 YYYYMMDD 8자리 입력 후 `YYYY-MM-DD`로 포맷), 행사유형·관계(`Chip`)를 받는다(Assumption 9).
  - `location.state.prefill`이 있으면 시트가 **자동 오픈**되고 `recommendedAmount`가 금액 필드에 채워진다. **state가 null/undefined여도 크래시 없이 시트가 닫힌 상태로 렌더된다.**
  - 저장 결과 `code:409`(중복) → `AlertDialog` "같은 날짜에 같은 이름의 기록이 이미 있어요 / 그래도 새 기록으로 저장할까요?" [취소/저장]. **BottomSheet는 열린 채 입력값 전부 유지**되고, "저장" 선택 시 `add(input, { force: true })` 재시도로 성공(F5 AC-10).
  - 저장 결과 `code:409`(동시수정) → `ERROR_MESSAGES[409]` Toast + **시트 닫힘** + 목록 최신값 갱신(F5 AC-13).
  - 저장 결과 `413`/`507` → 해당 Toast 표시하고 **시트 유지**(F1 AC-5·6).
  - 금액 필드 포커스 시 시트가 키보드 높이만큼 상승해 "저장" 버튼(≥ 52px)이 가려지지 않는다(F5 AC-4, `visualViewport` 기반).
- **Covers**: [F5 추가·수정 시트 패킷(F5 AC-5·AC-6), F5 AC-4(키보드), F5 AC-10(409 중복), F5 AC-13(409 동시수정), F1 AC-5·AC-6 UI 반영]
- **Files**: `src/components/RecordSheet.tsx`, `src/pages/History.tsx`
- **Depends on**: Task 3.5, Task 2.2

### Task 3.7 히스토리 상세 `/history/:id` (404 · 수정 · 삭제)
- **Description**: 단일 레코드 상세와 수정/삭제 동작.
- **DoD**:
  - `useParams<{ id: string }>()`만 사용하고 `location.state`는 **참조 0회**(grep 검증).
  - `data-testid="record-detail-card"` Card 1개: 금액(t3 강조) + 상세 6행(`ListRow`), 행사·관계 `Chip`.
  - 존재하지 않는 `:id` → 흰 화면 없이 정확히 "삭제되었거나 없는 기록이에요" + "목록으로" 버튼 렌더(테스트 필수).
  - `SubmitFooter`에 "수정하기"(primary, `display="block"`), 아래 텍스트 버튼 "삭제". 모든 버튼 높이 ≥ 48px.
  - 삭제 → `AlertDialog` 확인 후 `navigate('/history', { replace: true })`.
  - 수정 저장 시 `baseUpdatedAt` 불일치 → `ERROR_MESSAGES[409]` Toast + 최신값 재조회(F1 AC-11).
  - 수정 시트 열린 채 레코드가 사라지면 저장 시 `code:404` → `ERROR_MESSAGES[404]` Toast + `navigate('/history', { replace: true })`(F1 AC-12).
  - Loading: Skeleton 카드 1개. 광고 컴포넌트 사용 0건.
- **Covers**: [F5 상세·삭제 패킷(F5 AC-8·AC-9), F1 AC-11, F1 AC-12, S5 전체 계약]
- **Files**: `src/pages/HistoryDetail.tsx`
- **Depends on**: Task 3.6

### Task 3.8 통계 `/stats` — 요약 영역
- **Description**: `SummaryHero` + 요약 카드 2개. 상세/게이트는 다음 태스크.
- **DoD**:
  - 최상단 `SummaryHero`(총 지출, CountUp) 1개.
  - `data-testid="stat-card"` Card **2개 이상**: 요약 지표 3종(총액/건수/평균) + 행사 유형 비중(`MiniBar`).
  - `data-testid="trend-sparkline"` `Sparkline` 1개(최근 6개월, 값 0인 달 포함해 포인트 6개).
  - Loading: Hero Skeleton 1개 + 카드 Skeleton 2개.
  - Empty(0건): `Asset.ContentIcon` + "기록이 없어 통계를 만들 수 없어요" + "기록 추가하러 가기" → `navigate('/history', { state: { prefill: null } })`.
  - 다른 탭에서 기록 변경 시 `useRecords` 구독으로 집계가 **재계산되어 총액 텍스트가 갱신**된다(테스트 1케이스).
- **Covers**: [F6 집계+요약 패킷, F1 AC-13(화면 반영), S6 레이아웃·Empty·Outgoing 계약]
- **Files**: `src/pages/Stats.tsx`
- **Depends on**: Task 2.5, Task 2.6

### Task 3.9 통계 상세 시각화 + 리워드 게이트 + 401
- **Description**: `detail-stats` 영역을 `TossRewardAd`로 게이트하고 토스 앱 외부 실행을 처리한다.
- **DoD**:
  - `data-testid="detail-stats"` 영역이 잠금 상태에서 블러 미리보기만 렌더하고 **수치 텍스트가 DOM에 없다**(`queryByText(/[0-9,]+원/)` null).
  - 해제 버튼 높이 ≥ 48px, `TossRewardAd` 시청 완료 → `unlockReward` → 상세 표시. `isRewardUnlocked === true`면 광고 없이 즉시 표시.
  - 광고 실패 → `ERROR_MESSAGES[500]` Toast, 잠금 유지.
  - `getIsTossLoginIntegratedService()`가 false(토스 앱 외부) → 해제 버튼 대신 `ERROR_MESSAGES[401]` 안내 문구를 렌더하고, **요약 통계·목록 등 로컬 기능은 정상 동작**(차단 화면 금지, Assumption 11 / F8 AC-10).
- **Covers**: [F6 상세 시각화+게이트 패킷, F8 AC-10(401 graceful degradation), S6 Locked/Error/401 상태]
- **Files**: `src/pages/Stats.tsx`, `src/components/RewardGate.tsx`
- **Depends on**: Task 3.8, Task 3.4

### Task 3.10 공유 카드 `/share`
- **Description**: 3:4 카드 렌더 + 클립보드 텍스트 복사.
- **DoD**:
  - `const state = (useLocation().state as RouteState["/share"]) ?? null; if (!state) return <Navigate to="/" replace />;` — **state 없이 직접 진입/새로고침 시 크래시 없이 `/`로 replace**(테스트 필수).
  - `data-testid="share-card"` Card 1개, 3:4 비율 컨테이너(커스텀 CSS flex만 사용, TDS 여백 오버라이드 0건). 내부 순서: 배지(`Chip`) → 권장 금액(t2 이상) → 권장 범위 → "참고용 권장 금액이에요" 캡션.
  - `SubmitFooter` "결과 복사하기" 버튼 ≥ 52px, 뒤로가기 ≥ 44px(→ `navigate(-1)`).
  - 복사 성공 → 성공 Toast. `navigator.clipboard.writeText` reject → `ERROR_MESSAGES[500]`("복사에 실패했어요. 화면을 캡처해 공유해주세요") Toast.
  - 이 화면에 `AdSlot`/`TossRewardAd` 사용 **0건**(grep 검증 — 캡처 영역 오염 방지).
  - Loading: 카드 자리 Skeleton 1개.
- **Covers**: [F7 전체(카드 렌더+복사 패킷), S7 전체 계약, Assumption 5]
- **Files**: `src/pages/Share.tsx`
- **Depends on**: Task 3.3

### Task 3.11 설정 `/settings`
- **Description**: 계산 기준 / 데이터 관리 2개 섹션.
- **DoD**:
  - `ListRow` 그룹 2개(계산 기준: 기본 지역·물가 보정 기본값 / 데이터 관리: 모든 기록 삭제·앱 버전)를 섹션 헤더로 구분. 간격은 `Spacing`(size prop 필수)으로만 조절, `ListRow`에 padding prop 사용 0건.
  - 기본 지역 탭 → `BottomSheet` 지역 선택, 선택 시 `saveSettings` 호출.
  - 물가 보정 `Switch`(터치 영역 ≥ 44×44px), 모든 ListRow 높이 ≥ 56px.
  - 저장 요청 진행 중 해당 `Switch`/`ListRow`는 `disabled`(중복 요청 0회, F8 AC-12).
  - 저장 실패(`500`/`507`) → Toast 표시 + **UI가 이전 값을 유지**(Switch가 되돌아옴)(F8 AC-5).
  - 기록 0건 → "모든 기록 삭제" ListRow `disabled`. 삭제는 `AlertDialog` 확인 후 `clearAll()`.
  - Loading: Skeleton ListRow 3개. 광고 컴포넌트 0건.
- **Covers**: [F8 설정 화면 패킷(F8 AC-1~AC-4), F8 AC-5, F8 AC-12, S8 전체 계약]
- **Files**: `src/pages/Settings.tsx`
- **Depends on**: Task 2.6

---

## Epic 4. 통합 + 폴리시 점검

**Risk Assessment**
- Complexity: **Medium**
- Risk factors: (a) 라우터 배선 누락 시 `/history/:id` 새로고침에서 404. (b) 오버레이가 탭 전환 후 살아남아 `body` 스크롤 잠금이 풀리지 않음(F5 AC-12). (c) 광고 위치 오배치(목록 중간 삽입, `FloatingTabBar` 겹침)로 검수 반려. (d) env 미주입 시 광고 컴포넌트가 레이아웃을 무너뜨림.
- Mitigation: 모든 페이지가 완성된 뒤에 배선하므로 라우트·state 계약 불일치가 한 곳에서 드러난다. 오버레이 수명주기는 페이지별 중복 구현 대신 4.2에서 전역 훅 1개로 처리해 누락 지점을 없앤다. 4.4의 정적 검증 스크립트가 403/CORS/프로모션 0건을 CI로 못 박는다.

### Task 4.1 라우팅 + FloatingTabBar 배선
- **Description**: `react-router-dom` 라우트 트리와 하단 탭 구성.
- **DoD**:
  - `src/App.tsx`에 `/`, `/calc`, `/result`, `/history`, `/history/:id`, `/stats`, `/share`, `/settings` 8개 라우트 + `*` → `/` replace 정의.
  - `src/components/FloatingTabBar`(템플릿 제공)에 홈·히스토리·통계·설정 4탭 배선. `/result`·`/share`·`/history/:id`에서는 탭바 미표시.
  - `navigate()` 호출부 전수 점검: 각 호출의 `state` 인자가 `RouteState`의 해당 키 타입과 일치하며 `satisfies` 또는 명시 타입으로 검증됨. `npx tsc --noEmit` 종료 코드 0.
  - `/result`, `/share`에 state 없이 직접 진입하는 e2e 2케이스가 **크래시 없이 `/`로 이동**함을 확인.
- **Covers**: [S1~S8 Navigation state contract 전체, AC-G(라우팅) 항목]
- **Files**: `src/App.tsx`, `src/routes.tsx`
- **Depends on**: Task 3.1~3.11 전체

### Task 4.2 오버레이 수명주기 + 탭 간 동기화 배선
- **Description**: 라우트 변경·뒤로가기 시 열린 오버레이를 일괄 정리하고 목록/통계를 최신화한다.
- **DoD**:
  - `src/hooks/useOverlayLifecycle.ts`: `useLocation().key` 변화 시 열린 `BottomSheet`/`AlertDialog`를 모두 닫고 입력값 state를 초기화하며 `document.body.style.overflow`를 원복한다.
  - 테스트: BottomSheet 열린 상태 → 탭 이동 → (i) 시트 DOM 제거, (ii) 재진입 시 입력값 빈 값, (iii) `document.body.style.overflow !== 'hidden'` 3항목 모두 통과(F5 AC-12).
  - 브라우저 뒤로가기(`popstate`)에서도 동일 3항목 통과.
  - 다른 탭의 레코드 변경 시 `/history` 목록과 `/stats` 집계가 재조회된다(e2e 1케이스, F1 AC-13 / F5 AC-13).
- **Covers**: [F5 AC-12(오버레이 수명주기), F5 AC-13(동시수정 갱신), F1 AC-13]
- **Files**: `src/hooks/useOverlayLifecycle.ts`, `src/pages/History.tsx`, `src/pages/HistoryDetail.tsx`, `src/pages/Settings.tsx`
- **Depends on**: Task 4.1

### Task 4.3 광고 배치 확정 + env 빈값 안전
- **Description**: `AdSlot` 배치를 SPEC 위치로 고정하고 env 미주입 상황을 방어한다.
- **DoD**:
  - `/history`: `AdSlot` **정확히 1개**, 마지막 ListRow 아래에 위치. 목록 중간 삽입 0건, `FloatingTabBar`와 겹침 0px(하단 여백 확보).
  - `/stats`: `AdSlot` **정확히 1개**, 요약 카드와 `detail-stats` 섹션 **사이**.
  - `/history/:id`, `/share`, `/settings`: `AdSlot`/`TossRewardAd` 사용 0건(grep 검증).
  - `VITE_TOSS_AD_GROUP_ID`/`VITE_TOSS_AD_SLOT_ID`가 빈 문자열일 때 광고 컴포넌트가 **아무것도 렌더하지 않고**, 해당 화면 스냅샷의 레이아웃 높이가 광고 영역만큼만 줄어들 뿐 요소 겹침 0건(Assumption 6).
- **Covers**: [S4·S5·S6·S7·S8 광고 계약, Assumption 6]
- **Files**: `src/pages/History.tsx`, `src/pages/Stats.tsx`, `src/components/AdSlot`(사용부만)
- **Depends on**: Task 4.1

### Task 4.4 정책·격리 정적 검증 (403 · CORS · 프로모션 · IAP · TDS)
- **Description**: 검수 반려 요인을 CI 스크립트로 못 박는다.
- **DoD**: `npm run check:policy`(신규 스크립트) 종료 코드 0이며 아래 전부 검증한다.
  - `localStorage` 참조가 `src/lib/storage.ts` 외 **0건**, 사용 키가 `gmc:` 접두사만 존재(F8 AC-11 / 403).
  - `fetch(`/`XMLHttpRequest`/`axios` 호출 **0건** → 외부 API 없음, CORS 에러 0건(F8 AC-9).
  - `grantPromotionReward` 참조 **0건**(F8 AC-8 / Assumption 8).
  - `TossPurchase`/`createOneTimePurchaseOrder` 참조 **0건**(Assumption 7).
  - 금지 UI 라이브러리(`@mui`, `antd`, `@chakra-ui`, `shadcn`) import **0건**.
  - `src/pages/**`에서 TDS 컴포넌트에 `className`으로 `p-*`/`m-*`/`gap-*` 부착 **0건**, 인라인 `padding`/`margin` **0건**.
  - `ERROR_MESSAGES` 외 오류 문구 하드코딩 0건(Task 1.2 스크립트 재사용, AC-G9).
- **Covers**: [F8 AC-6·AC-7(정책 점검), F8 AC-8, F8 AC-9, F8 AC-11, AC-G9, Assumption 7·8·12]
- **Files**: `scripts/check-policy.mjs`, `package.json`
- **Depends on**: Task 4.3

---

## AC Coverage

**집계 단위**: SPEC 발췌본에서 ID로 식별 가능한 AC(F1 13 + F5 13 + F8 12 + AC-G 9 = 47) + 화면 계약(S4~S8 = 5) + 발췌본에 AC 텍스트가 없어 패킷 단위로 귀속한 기능(F2, F3, F4, F6, F7 = 5) = **57 단위**

- **Total ACs in SPEC: 57 단위**
- **Covered by tasks: 57**

| 단위 | 담당 태스크 |
|---|---|
| F1 AC-1~4, AC-7, AC-8 | 2.1 |
| F1 AC-5(413) | 2.1, 3.6 |
| F1 AC-6(507) | 2.1, 3.6 |
| F1 AC-9(ID 409) | 2.2 |
| F1 AC-10(중복 409) | 2.2 |
| F1 AC-11(낙관적 잠금 409) | 2.2, 3.7 |
| F1 AC-12(404) | 2.2, 3.7 |
| F1 AC-13(subscribeRecords) | 2.2, 2.6, 3.8, 4.2 |
| F2 전체(계산 엔진) | 2.4 |
| F3 AC-1~8(홈·입력 폼) | 3.1, 3.2 |
| F3 AC-9(region 보존/422) | 2.3, 3.2 |
| F4 전체(결과+리워드 게이트) | 3.3, 3.4 |
| F5 AC-1~3(목록·필터) | 3.5 |
| F5 AC-4(키보드) | 3.6 |
| F5 AC-5·6(추가·수정) | 3.6 |
| F5 AC-7(윈도잉 ≤30) | 3.5 |
| F5 AC-8·9(상세·삭제) | 3.7 |
| F5 AC-10(409 중복 다이얼로그) | 3.6 |
| F5 AC-11(416/offset 클램프) | 3.5 |
| F5 AC-12(오버레이 수명주기) | 4.2 |
| F5 AC-13(409 동시수정) | 3.6, 4.2 |
| F6 전체(집계·요약·상세) | 2.5, 3.8, 3.9 |
| F7 전체(공유 카드·복사) | 3.10 |
| F8 AC-1~4(설정 화면) | 3.11 |
| F8 AC-5(저장 실패 롤백) | 2.3, 3.11 |
| F8 AC-6·7(정책 점검) | 4.4 |
| F8 AC-8(프로모션 0건) | 4.4 |
| F8 AC-9(CORS 0건) | 4.4 |
| F8 AC-10(401) | 3.9 |
| F8 AC-11(403 격리) | 2.1, 4.4 |
| F8 AC-12(확인 후 반영·saving) | 2.3, 2.6, 3.11 |
| AC-G1~G8(공통 품질·라우팅·터치·TDS) | 3.1~3.11, 4.1, 4.4 |
| AC-G9(오류 문구 단일 소스) | 1.2, 4.4 |
| S4 계약 | 3.5, 3.6, 4.3 |
| S5 계약 | 3.7 |
| S6 계약 | 3.8, 3.9, 4.3 |
| S7 계약 | 3.10 |
| S8 계약 | 3.11 |

- **Uncovered: 0**

**추가 확인 필요(Open Questions 연동)**: Open Q1(기준표 재검증) 확정 시 Task 2.4의 `rules.ts` 상수 교체 패킷 1개 추가, Open Q7(중복 키에 `relationship` 포함) 확정 시 Task 2.2의 중복 판정 키 1줄 수정으로 흡수됩니다.