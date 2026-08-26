# SPEC — GiftMoneyCalc (앱인토스)

> 관계·지역·물가를 반영해 축의금·부의금 적정 금액을 알려주는 계산기
> Stack: Vite + React + TypeScript + TDS(@toss/tds-mobile) + react-router-dom + localStorage
> 서버 없음 / 외부 API 없음 / 데이터 전량 단말 로컬 저장

---

## Common Principles

**CP-1. UI 구성**
- 모든 UI는 TDS 컴포넌트(ListRow, Button, TextField, Paragraph.Text, Chip, Switch, AlertDialog, BottomSheet, Toast, Top, Tab, Spacing)로만 조립한다. shadcn/ui, MUI, Ant Design, Chakra 사용 금지.
- 하단 탭 네비게이션은 템플릿 제공 `src/components/FloatingTabBar`를 사용한다(TDS에 TabBar 없음). `Tab`은 화면 내부 콘텐츠 전환에만 사용한다.
- 모든 페이지는 `ScreenScaffold`로 감싼다. raw `div` 골격 금지.
- 1차 액션은 `SubmitFooter`(하단 고정) 또는 `display="block"` TDS Button만 사용한다. 좌측 글자폭 버튼 금지.
- 여백은 TDS `Spacing`(size prop 필수)으로만 조절한다. TDS 컴포넌트에 Tailwind/인라인 padding·margin 덮어쓰기 금지.
- 커스텀 CSS는 TDS가 제공하지 않는 flex/grid 배치에만 허용한다.

**CP-2. 색상**
- HEX 하드코딩(`#FFFFFF`, `#333` 등) 금지. 색상은 `var(--tds-color-*)` CSS 변수 또는 TDS 컴포넌트 기본값만 사용한다. 다크모드 필수 지원.
- 예외: Canvas 렌더링(F6 공유 카드)은 CSS 변수를 `getComputedStyle`로 읽어 사용한다. Canvas 코드 내 HEX 리터럴 금지.

**CP-3. 인증**
- 토스 앱이 세션을 자동 제공한다. 로그인 함수 호출·커스텀 인증 구현 금지. 유저 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태만 확인한다.

**CP-4. 수익화**
- 배너: 템플릿 제공 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`. 콘텐츠 섹션 사이 또는 콘텐츠 하단에만 배치하며, 콘텐츠와 겹치거나 1차 액션 버튼을 가리지 않는다.
- 리워드: 템플릿 제공 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`. 통계 상세 리포트(F5) 게이트에만 사용한다.
- IAP·프로모션 리워드는 MVP 범위 밖(사용 안 함).

**CP-5. 데이터**
- 모든 영속 데이터는 localStorage에 저장한다. 키 접두사는 `gmc:`, 버전 접미사는 `:v1`.
- 모든 쓰기는 템플릿 localStorage helper를 통해 수행하며 `QuotaExceededError`를 catch한다.
- 서버 전송·외부 분석 솔루션(GA, Amplitude 등) 사용 금지.

**CP-6. 모바일**
- 모든 터치 대상은 최소 44×44px(TDS Button `size="large"`, ListRow 기본 높이, Chip은 `min-height: 44px` 래퍼 flex 컨테이너).
- 숫자 입력 TextField는 `inputMode="numeric"`, 텍스트 입력은 `enterKeyHint="done"`.
- 키보드 노출 시 하단 고정 SubmitFooter는 키보드 위로 밀려 올라가며(`env(safe-area-inset-bottom)` + `visualViewport` 리사이즈 대응) 입력 필드를 가리지 않는다.

**CP-7. 계산 규칙**
- 금액 산출은 100% 결정적 규칙 기반이며 생성형 AI를 사용하지 않는다. 따라서 AI 고지 문구는 표시하지 않는다(허위 고지 방지). 대신 결과 화면에 "관례 기준 참고값입니다. 실제 금액은 개인 상황에 따라 달라질 수 있어요." 고지를 표시한다.

**CP-8. 검수**
- 프로덕션 빌드 런타임에서 `console.error` 출력 0개.
- `window.location.href`, `window.open`을 통한 외부 도메인 이동 코드 0개. 화면 전환은 react-router `navigate`만 사용.
- 앱 설치 유도 문구/배너/링크 0개.
- Android 7+, iOS 16+ 호환. 사용 금지 API: `Array.prototype.findLast`, `Object.groupBy`, `structuredClone`, CSS `:has()`, `Intl.Segmenter`.

---

## Data Models

### EventType (경조사 유형)
| 값 | 라벨 | baseAmount(원) |
|---|---|---|
| `wedding` | 결혼식 | 50000 |
| `funeral` | 장례식 | 50000 |
| `firstBirthday` | 돌잔치 | 30000 |
| `opening` | 개업식 | 50000 |

### RelationType (관계)
| 값 | 라벨 | relationFactor |
|---|---|---|
| `family` | 가족·친척 | 3.0 |
| `closeFriend` | 친한 친구 | 2.0 |
| `friend` | 친구·지인 | 1.0 |
| `coworker` | 직장 동료 | 1.0 |
| `boss` | 직장 상사 | 1.0 |
| `acquaintance` | 얼굴만 아는 사이 | 0.6 |

### Intimacy (친밀도 1~5)
| 값 | 라벨 | intimacyFactor |
|---|---|---|
| 1 | 거의 연락 안 함 | 0.8 |
| 2 | 가끔 연락 | 0.9 |
| 3 | 보통 | 1.0 |
| 4 | 자주 만남 | 1.2 |
| 5 | 매우 가까움 | 1.4 |

### RegionType (지역·물가 보정)
| 값 | 라벨 | regionFactor |
|---|---|---|
| `seoulGangnam` | 서울 강남권 | 1.2 |
| `metropolitan` | 서울(그 외)·수도권 | 1.1 |
| `majorCity` | 광역시 | 1.0 |
| `other` | 그 외 지역 | 0.9 |

### Attendance (참석 여부)
| 값 | attendanceFactor |
|---|---|
| `attending` (참석·식사) | 1.6 |
| `absent` (미참석·송금) | 1.0 |

### AMOUNT_LADDER (관례 금액 사다리)
`[30000, 50000, 70000, 100000, 150000, 200000, 300000, 500000, 1000000]`

### TypeScript 인터페이스

```ts
export type EventType = 'wedding' | 'funeral' | 'firstBirthday' | 'opening';
export type RelationType =
  | 'family' | 'closeFriend' | 'friend' | 'coworker' | 'boss' | 'acquaintance';
export type RegionType = 'seoulGangnam' | 'metropolitan' | 'majorCity' | 'other';
export type Attendance = 'attending' | 'absent';
export type Intimacy = 1 | 2 | 3 | 4 | 5;
export type Direction = 'given' | 'received';

export interface CalcInput {
  eventType: EventType;
  relation: RelationType;
  intimacy: Intimacy;
  attendance: Attendance;
  region: RegionType;
}

export interface BreakdownItem {
  label: string;    // "관계: 친한 친구"
  factor: number;   // 2.0
}

export interface CalcResult {
  recommended: number;          // AMOUNT_LADDER 스냅 결과
  min: number;                  // ladder[i-1] (i=0이면 ladder[0])
  max: number;                  // ladder[i+1] (i=last면 ladder[last])
  rawAmount: number;            // 스냅 전 원값 (정수, Math.round)
  breakdown: BreakdownItem[];   // 길이 5 고정 (기본금액 제외 4개 + 기본금액 1개)
  input: CalcInput;
}

export interface GiftRecord {
  id: string;              // crypto.randomUUID()
  personName: string;      // 1~20자
  eventType: EventType;
  relation: RelationType;
  amount: number;          // 1000 ~ 10000000, 1000원 단위
  date: string;            // 'YYYY-MM-DD'
  direction: Direction;    // 'given' = 내가 줌, 'received' = 내가 받음
  memo: string;            // 0~50자
  createdAt: number;       // Date.now()
}

export interface Settings {
  defaultRegion: RegionType;   // 기본값 'majorCity'
  onboardingDone: boolean;     // 기본값 false
  compactList: boolean;        // 기본값 false
}

export interface LastCalc {
  input: CalcInput;
  result: CalcResult;
  at: number;
}

export interface RewardUnlock {
  statsUnlockedUntil: number;  // epoch ms, 시청 시점 + 24h
}
```

### Data Storage (localStorage)

| 키 | 값 타입 | 초기값 | 크기 추정 |
|---|---|---|---|
| `gmc:records:v1` | `GiftRecord[]` | `[]` | 1건 ≈ 220B. 상한 1,000건 → 최대 220KB |
| `gmc:settings:v1` | `Settings` | `{defaultRegion:'majorCity',onboardingDone:false,compactList:false}` | ≈ 90B |
| `gmc:lastCalc:v1` | `LastCalc \| null` | `null` | ≈ 500B |
| `gmc:rewardUnlock:v1` | `RewardUnlock` | `{statsUnlockedUntil:0}` | ≈ 40B |

**총 상한 ≈ 221KB (5MB 대비 4.4%).** 기록 1,000건 도달 시 신규 저장을 거부하고 안내한다.

---

## Feature List

---

### F1. 계산 엔진 + 스토리지 레이어

- **Description:** `CalcInput`을 받아 `CalcResult`를 반환하는 순수 함수 `calcGiftAmount()`와, 4개 localStorage 키에 대한 타입 안전 read/write 래퍼(`storage.ts`)를 구현한다. UI 없이 로직만 담당하며 모든 화면이 이 모듈을 통해서만 데이터에 접근한다. 파싱 실패·용량 초과 시 안전한 기본값으로 폴백한다.
- **Data:** `CalcInput`, `CalcResult`, `GiftRecord`, `Settings`, `LastCalc`, `RewardUnlock`
- **API:** 없음 (외부 통신 없음)
- **Requirements:**
  - `rawAmount = Math.round(base × relationFactor × intimacyFactor × attendanceFactor × regionFactor)`
  - `recommended` = AMOUNT_LADDER 중 `|ladder[i] - rawAmount|`가 최소인 값. 동률이면 더 작은 값.
  - `min = ladder[Math.max(0, i-1)]`, `max = ladder[Math.min(8, i+1)]`
  - `attendance`는 `funeral`에서도 동일 계수 적용(조문 후 식사 관례).

**AC-1 [U][P0]: Scenario: 표준 케이스 산출**
- Given 계산 엔진이 로드되어 있을 때
- When `calcGiftAmount({ eventType:'wedding', relation:'coworker', intimacy:3, attendance:'absent', region:'majorCity' })` 호출
- Then `rawAmount === 50000`, `recommended === 50000`, `min === 30000`, `max === 70000` 반환
- And `breakdown.length === 5`

**AC-2 [U][P0]: Scenario: 다중 계수 곱 및 사다리 스냅**
- Given 계산 엔진이 로드되어 있을 때
- When `calcGiftAmount({ eventType:'wedding', relation:'closeFriend', intimacy:4, attendance:'attending', region:'metropolitan' })` 호출
- Then `rawAmount === 211200`, `recommended === 200000`, `min === 150000`, `max === 300000` 반환

**AC-3 [U][P0]: Scenario: 사다리 하한 경계**
- Given 계산 엔진이 로드되어 있을 때
- When `calcGiftAmount({ eventType:'firstBirthday', relation:'acquaintance', intimacy:1, attendance:'absent', region:'other' })` 호출
- Then `rawAmount === 12960`, `recommended === 30000`, `min === 30000`, `max === 50000` 반환

**AC-4 [E][P0]: Scenario: 기록 저장**
- Given `gmc:records:v1`이 `[]`일 때
- When `addRecord({ personName:'김토스', eventType:'wedding', relation:'friend', amount:100000, date:'2026-09-12', direction:'given', memo:'' })` 호출
- Then `gmc:records:v1`에 항목 1개가 저장되고, `id`는 36자 UUID, `createdAt`은 정수 epoch ms
- And `getRecords()`가 length 1 배열을 반환

**AC-5 [W][P1]: Scenario: 손상된 JSON 폴백**
- Given `localStorage.getItem('gmc:records:v1')`가 문자열 `'{{{not-json'`일 때
- When `getRecords()` 호출
- Then 빈 배열 `[]`을 반환하고 `console.error`를 호출하지 않음
- And `gmc:records:v1`이 `'[]'`로 복구 저장됨

**AC-6 [W][P1]: Scenario: 저장 용량 초과**
- Given `localStorage.setItem`이 `QuotaExceededError`를 throw하는 상태일 때
- When `addRecord(...)` 호출
- Then 반환값이 `{ ok: false, reason: 'QUOTA_EXCEEDED' }`이고 예외가 상위로 전파되지 않음

**AC-7 [W][P1]: Scenario: 기록 상한 초과**
- Given `gmc:records:v1`에 1,000건이 저장되어 있을 때
- When `addRecord(...)` 호출
- Then 반환값이 `{ ok: false, reason: 'LIMIT_REACHED' }`이고 저장 건수는 1,000건 그대로 유지됨

**AC-8 [S][P1]: Scenario: 스토리지 초기 로딩 상태**
- Given 앱이 최초 마운트되어 storage 초기화가 완료되기 전일 때
- While `isStorageReady === false`
- Then `useStorage()` 훅은 `{ ready:false, records: [], settings: DEFAULT_SETTINGS }`를 반환하고 화면은 TDS Skeleton을 렌더링함

---

### F2. 금액 계산 입력 (Calculator Form)

- **Description:** 경조사 유형·관계·친밀도·참석 여부·지역을 순차 선택하는 단일 스크롤 폼 화면이다. 모든 선택지는 TDS Chip 그룹으로 제공하며 텍스트 입력은 없어 키보드가 뜨지 않는다. 지역 기본값은 설정(`defaultRegion`)에서 프리필된다.
- **Data:** `CalcInput`, `Settings.defaultRegion`
- **API:** 없음
- **Requirements:** 5개 선택 그룹 모두 선택 완료 시에만 하단 SubmitFooter의 "적정 금액 계산하기" 버튼이 활성화된다.

**AC-1 [E][P0]: Scenario: 계산 실행 및 결과 이동**
- Given `/calc` 화면에서 지역이 `majorCity`로 프리필된 상태일 때
- When 유형 `결혼식`, 관계 `친한 친구`, 친밀도 `4`, 참석 `참석할 거예요`를 탭하고 "적정 금액 계산하기" 버튼 탭
- Then `gmc:lastCalc:v1`에 `{input, result, at}`이 저장됨
- And `navigate('/result', { state: { input: CalcInput } })`로 이동함

**AC-2 [S][P0]: Scenario: 미완성 입력 시 버튼 비활성**
- Given `/calc` 화면 진입 직후 유형만 `결혼식`으로 선택된 상태일 때
- While 관계·친밀도·참석 중 하나라도 미선택
- Then "적정 금액 계산하기" TDS Button은 `disabled={true}`이고 탭해도 라우팅이 발생하지 않음

**AC-3 [U][P0]: Scenario: 지역 기본값 프리필**
- Given `gmc:settings:v1`의 `defaultRegion`이 `'seoulGangnam'`일 때
- When `/calc` 화면 진입
- Then 지역 Chip 그룹에서 `서울 강남권` Chip이 선택 상태(`aria-pressed="true"`)로 표시됨

**AC-4 [U][P1]: Scenario: 터치 타겟 크기**
- Given `/calc` 화면이 렌더링되었을 때
- Then 모든 Chip 요소의 렌더된 높이가 44px 이상이고, SubmitFooter 버튼 높이가 48px 이상임

**AC-5 [W][P1]: Scenario: 잘못된 state로 진입**
- Given 유저가 `/calc`로 직접 진입해 `location.state`가 `null`일 때
- When 화면이 마운트됨
- Then 예외 없이 빈 폼이 렌더링되고 유형 Chip 그룹이 미선택 상태로 표시됨

**AC-6 [W][P1]: Scenario: 계산 중 중복 탭 방지**
- Given "적정 금액 계산하기" 버튼을 1회 탭해 계산이 진행 중일 때
- While `isSubmitting === true`
- Then 버튼은 `disabled={true}`가 되고, 300ms 내 추가 탭이 발생해도 `navigate`는 총 1회만 호출됨

**AC-7 [S][P1]: Scenario: 설정 로딩 중 표시**
- Given storage 초기화가 완료되지 않은 상태에서 `/calc`에 진입했을 때
- While `ready === false`
- Then 지역 Chip 그룹 자리에 TDS Skeleton이 표시되고 SubmitFooter 버튼은 `disabled={true}`임

---

### F3. 결과 화면 (권장 금액 + 근거)

- **Description:** `CalcInput`을 받아 권장 금액을 CountUp 히어로로 크게 보여주고, 적정 범위와 계산 근거(계수 breakdown)를 Card로 표현한다. 하단에서 "이 금액으로 기록 저장"과 "공유 카드 만들기"로 분기한다. 계산 결과는 무료 즉시 노출한다(핵심 가치 게이트 금지).
- **Data:** `CalcResult`, `LastCalc`
- **API:** 없음
- **Requirements:** `location.state.input`이 없으면 `gmc:lastCalc:v1`을 폴백으로 사용하고, 그것도 없으면 `/calc`로 리다이렉트한다.

**AC-1 [E][P0]: Scenario: 결과 렌더링**
- Given `navigate('/result', { state: { input: { eventType:'wedding', relation:'closeFriend', intimacy:4, attendance:'attending', region:'metropolitan' } } })`로 진입했을 때
- When 화면이 마운트됨
- Then `data-testid="recommend-hero"` 요소에 최종 텍스트 `200,000원`이 표시됨
- And `data-testid="range-card"` 요소에 텍스트 `150,000원 ~ 300,000원`이 표시됨

**AC-2 [U][P0]: Scenario: 레이아웃 계약**
- Given `/result` 화면이 렌더링되었을 때
- Then 페이지 루트는 `ScreenScaffold`이며, `data-testid="recommend-hero"`(SummaryHero, CountUp 적용), `data-testid="range-card"`(Card), `data-testid="breakdown-card"`(Card) 3개 블록이 이 순서로 존재함
- And 권장 금액 값은 타이포 `t2` 이상으로 강조 표기됨

**AC-3 [U][P0]: Scenario: 근거 breakdown 표시**
- Given `/result`에 `{ relation:'closeFriend', intimacy:4, attendance:'attending', region:'metropolitan' }` 결과가 표시될 때
- Then `data-testid="breakdown-card"` 내부에 TDS ListRow 5개가 렌더링되고, 각각 텍스트 `기본 금액 50,000원`, `관계: 친한 친구 ×2.0`, `친밀도: 자주 만남 ×1.2`, `참석: 참석 ×1.6`, `지역: 서울·수도권 ×1.1`을 포함함

**AC-4 [U][P1]: Scenario: 참고값 고지**
- Given `/result` 화면이 렌더링되었을 때
- Then 하단에 정확히 `관례 기준 참고값입니다. 실제 금액은 개인 상황에 따라 달라질 수 있어요.` 문구가 TDS Paragraph.Text로 표시됨

**AC-5 [E][P0]: Scenario: 기록 저장으로 이동**
- Given `/result`에 권장 금액 200,000원이 표시된 상태일 때
- When SubmitFooter의 "이 금액으로 기록 저장" 버튼 탭
- Then `navigate('/record/new', { state: { prefill: { eventType:'wedding', relation:'closeFriend', amount:200000 } } })`가 호출됨

**AC-6 [W][P1]: Scenario: state 없이 진입**
- Given `location.state`가 `null`이고 `gmc:lastCalc:v1`도 `null`일 때
- When `/result`에 진입
- Then `navigate('/calc', { replace: true })`가 호출되고 결과 UI는 렌더링되지 않음

**AC-7 [W][P1]: Scenario: 잘못된 타입의 state**
- Given `location.state`가 `{ input: { eventType: 'unknown' } }`일 때
- When `/result`에 진입
- Then 토스트 `계산 정보를 불러오지 못했어요` 표시 후 `navigate('/calc', { replace: true })` 실행, `console.error` 호출 없음

**AC-8 [S][P1]: Scenario: CountUp 진행 중 상태**
- Given `/result` 마운트 직후 CountUp 애니메이션이 진행 중일 때
- While 애니메이션 지속 시간(600ms) 내
- Then `data-testid="recommend-hero"`는 항상 숫자 텍스트를 포함하며 빈 문자열이 되지 않음

---

### F4. 경조사 기록 (입력 + 목록)

- **Description:** 누구에게 언제 얼마를 주고받았는지 기록하고 목록으로 조회한다. 기록 추가 화면은 이름·금액·날짜·방향(줌/받음)·메모를 입력하며, 결과 화면에서 넘어온 경우 유형·관계·금액이 프리필된다. 목록은 최신순 정렬하고 20건 단위로 더 불러온다.
- **Data:** `GiftRecord`, `gmc:records:v1`
- **API:** 없음
- **Requirements:** 이름 1~20자 필수, 금액 1,000~10,000,000원 & 1,000원 단위 필수, 날짜 `YYYY-MM-DD` 필수, 메모 0~50자.

**AC-1 [E][P0]: Scenario: 기록 저장 성공**
- Given `/record/new`에서 `gmc:records:v1`이 `[]`일 때
- When 폼에 `{ personName:'김토스', amount:100000, date:'2026-09-12', direction:'given', eventType:'wedding', relation:'friend', memo:'대학 동기' }`를 입력하고 "저장" 탭
- Then `gmc:records:v1`에 항목 1건이 저장되고 TDS Toast `기록을 저장했어요` 표시
- And `navigate('/history', { replace: true })` 실행 후 목록에 `김토스` ListRow가 표시됨

**AC-2 [W][P1]: Scenario: 빈 이름 거부**
- Given `/record/new` 화면일 때
- When `{ personName:'', amount:100000, date:'2026-09-12' }`로 "저장" 탭
- Then TDS TextField 하단에 에러 메시지 `이름을 입력해주세요` 표시되고 localStorage 쓰기가 발생하지 않음

**AC-3 [W][P1]: Scenario: 금액 범위·단위 위반 거부**
- Given `/record/new` 화면일 때
- When `{ personName:'김토스', amount:500, date:'2026-09-12' }`로 "저장" 탭
- Then 에러 메시지 `금액은 1,000원 이상 1,000원 단위로 입력해주세요` 표시
- And 동일 화면에서 `amount: 12500`으로 재제출 시에도 같은 에러 메시지가 표시됨

**AC-4 [E][P0]: Scenario: 결과 화면 프리필**
- Given `navigate('/record/new', { state: { prefill: { eventType:'wedding', relation:'closeFriend', amount:200000 } } })`로 진입했을 때
- When 화면이 마운트됨
- Then 금액 TextField의 값이 `200,000`, 유형 Chip `결혼식` 선택, 관계 Chip `친한 친구` 선택 상태로 표시되고 이름 TextField는 빈 값이며 자동 포커스됨

**AC-5 [S][P1]: Scenario: 빈 목록 상태**
- Given `gmc:records:v1`이 `[]`일 때
- While `/history` 화면에 머무름
- Then `data-testid="history-empty"` 영역에 `Asset.ContentIcon`과 텍스트 `아직 기록이 없어요`, `첫 기록 추가하기` TDS Button(display="block")이 표시됨

**AC-6 [U][P0]: Scenario: 목록 정렬 및 페이지네이션**
- Given `gmc:records:v1`에 `createdAt`이 서로 다른 45건이 저장되어 있을 때
- When `/history` 진입
- Then ListRow가 정확히 20개 렌더링되고 `createdAt` 내림차순으로 정렬됨
- And 목록 하단 도달 시 20개가 추가 렌더링되어 총 40개, 한 번 더 도달 시 45개가 되고 이후 추가 렌더링이 발생하지 않음

**AC-7 [E][P1]: Scenario: 기록 삭제**
- Given `/history`에 `김토스` 기록 1건이 있을 때
- When 해당 ListRow를 탭해 열린 TDS BottomSheet에서 "삭제" 탭, TDS AlertDialog에서 "삭제" 확인
- Then `gmc:records:v1`에서 해당 `id` 항목이 제거되고 Toast `기록을 삭제했어요` 표시

**AC-8 [W][P1]: Scenario: 저장 실패 안내**
- Given `addRecord`가 `{ ok:false, reason:'QUOTA_EXCEEDED' }`를 반환하는 상태일 때
- When "저장" 탭
- Then TDS AlertDialog에 `저장 공간이 부족해요. 오래된 기록을 삭제해주세요` 표시되고 화면 이동이 발생하지 않음

---

### F5. 통계 리포트 (리워드 광고 게이트)

- **Description:** 저장된 기록을 집계해 평균 금액, 유형별 분포, 최근 12개월 추이, 준 금액 대비 받은 금액을 보여준다. 상세 리포트 본문은 `TossRewardAd`로 게이트하며, 광고 시청 완료 시 24시간 동안 해제 상태가 유지된다. 요약 지표(총 건수·총 금액)는 게이트 밖에서 무료 노출한다.
- **Data:** `GiftRecord[]`, `RewardUnlock`
- **API:** 없음
- **Requirements:** 평균은 `direction === 'given'` 기록만 대상, 소수점 반올림 정수. 기록 0건이면 광고 게이트를 노출하지 않는다.

**AC-1 [E][P0]: Scenario: 결과 보기 전 보상형 광고**
- Given `gmc:records:v1`에 3건 이상 기록이 있고 `gmc:rewardUnlock:v1.statsUnlockedUntil`이 과거 시각일 때
- When `/stats`에서 "상세 리포트 보기" 버튼 탭 후 `TossRewardAd` 광고 시청 완료
- Then `data-testid="stats-detail"` 영역이 표시되고 `gmc:rewardUnlock:v1.statsUnlockedUntil`이 `현재시각 + 86400000`으로 저장됨

**AC-2 [S][P0]: Scenario: 해제 유효기간 내 재진입**
- Given `gmc:rewardUnlock:v1.statsUnlockedUntil`이 현재 시각보다 미래일 때
- While `/stats` 화면에 머무름
- Then 광고 시청 없이 `data-testid="stats-detail"`이 즉시 표시되고 "상세 리포트 보기" 버튼은 렌더링되지 않음

**AC-3 [U][P0]: Scenario: 집계 정확도**
- Given 기록이 `[{direction:'given',eventType:'wedding',amount:100000}, {direction:'given',eventType:'wedding',amount:50000}, {direction:'received',eventType:'wedding',amount:200000}]`일 때
- When `/stats` 상세가 해제된 상태로 진입
- Then `data-testid="stat-average"`에 `75,000원`, `data-testid="stat-given-total"`에 `150,000원`, `data-testid="stat-received-total"`에 `200,000원`이 표시됨

**AC-4 [U][P0]: Scenario: 레이아웃·시각화 계약**
- Given `/stats` 상세가 해제되고 기록이 3건 이상일 때
- Then `data-testid="stats-detail"` 내부에 `SummaryHero`(평균 금액, CountUp) 1개, `data-testid="trend-sparkline"`(최근 12개월 월별 합계 Sparkline) 1개, `data-testid="type-minibar"`(유형별 건수 비율 MiniBar) 1개가 Card로 묶여 존재함

**AC-5 [S][P1]: Scenario: 기록 부족 상태**
- Given `gmc:records:v1`이 `[]`일 때
- While `/stats` 화면에 머무름
- Then `Asset.ContentIcon`과 텍스트 `기록이 3건 이상 쌓이면 리포트를 볼 수 있어요`가 표시되고 "상세 리포트 보기" 버튼과 `TossRewardAd`가 렌더링되지 않음

**AC-6 [W][P1]: Scenario: 광고 로드 실패**
- Given `TossRewardAd`의 광고 로드가 실패(`onError`)했을 때
- When 유저가 "상세 리포트 보기"를 탭함
- Then Toast `광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요` 표시, 게이트는 잠긴 상태 유지, `console.error` 호출 없음

**AC-7 [W][P1]: Scenario: 광고 중도 이탈**
- Given 광고 재생 중 유저가 완료 전에 광고를 닫았을 때
- When `onClosed`가 `rewarded:false`로 호출됨
- Then `statsUnlockedUntil`이 갱신되지 않고 `data-testid="stats-detail"`이 표시되지 않으며 Toast `광고를 끝까지 봐야 리포트가 열려요` 표시

**AC-8 [S][P1]: Scenario: 집계 로딩 상태**
- Given `/stats` 진입 후 storage `ready === false`일 때
- While 집계가 계산되기 전
- Then Card 자리에 TDS Skeleton 3개가 표시되고 "상세 리포트 보기" 버튼은 `disabled={true}`임

---

### F6. 공유 카드뉴스 생성

- **Description:** 결과 화면의 권장 금액을 1080×1080 Canvas 카드 이미지로 렌더링해 미리보기하고, 이미지 저장 또는 텍스트 복사로 공유한다. 외부 SNS 도메인으로 이동하지 않으며, 앱 내 Canvas → Blob → `a[download]` 또는 `navigator.clipboard` 경로만 사용한다.
- **Data:** `CalcResult`(라우터 state로 전달)
- **API:** 없음
- **Requirements:** Canvas 색상은 `getComputedStyle(document.documentElement).getPropertyValue('--tds-color-*')`로 읽어 다크모드에 대응한다. 카드에는 앱 이름과 권장 금액, 조건 요약만 포함하고 개인 이름은 포함하지 않는다.

**AC-1 [E][P0]: Scenario: 카드 이미지 생성**
- Given `navigate('/share', { state: { result: CalcResult } })`로 진입했을 때
- When 화면이 마운트됨
- Then `data-testid="share-canvas"` canvas 요소의 `width === 1080`, `height === 1080`이고, 캔버스에 `200,000원`, `결혼식 · 친한 친구 · 참석`, `축의금 계산기` 텍스트가 그려짐

**AC-2 [E][P0]: Scenario: 이미지 저장**
- Given `/share`에 카드가 렌더링된 상태일 때
- When "이미지 저장" TDS Button(display="block") 탭
- Then `canvas.toBlob`으로 생성된 PNG가 `a[download="giftmoney-card.png"]` 클릭으로 저장되고 Toast `이미지를 저장했어요` 표시

**AC-3 [E][P1]: Scenario: 텍스트 복사**
- Given `/share`에 권장 금액 200,000원 카드가 렌더링된 상태일 때
- When "문구 복사" 버튼 탭
- Then 클립보드에 정확히 `결혼식 · 친한 친구 · 참석 기준 적정 축의금은 200,000원이에요 (적정 범위 150,000원~300,000원)`이 복사되고 Toast `문구를 복사했어요` 표시

**AC-4 [W][P0]: Scenario: 외부 도메인 이탈 금지**
- Given `/share` 화면 소스에서
- Then `window.open` 및 `window.location.href` 호출이 0개이며, 카카오/인스타그램 등 외부 SNS 딥링크·설치 유도 문구가 0개임

**AC-5 [W][P1]: Scenario: 클립보드 권한 없음**
- Given `navigator.clipboard.writeText`가 rejected Promise를 반환하는 환경일 때
- When "문구 복사" 탭
- Then Toast `복사에 실패했어요. 화면을 길게 눌러 복사해주세요` 표시, 화면 유지, `console.error` 호출 없음

**AC-6 [W][P1]: Scenario: 결과 state 누락**
- Given `location.state`가 `null`인 상태로 `/share`에 진입했을 때
- Then Toast `공유할 결과가 없어요` 표시 후 `navigate('/calc', { replace: true })` 실행

**AC-7 [S][P1]: Scenario: 캔버스 렌더링 중**
- Given `/share` 마운트 직후 canvas draw가 완료되기 전일 때
- While `isRendering === true`
- Then 캔버스 위에 TDS Skeleton이 표시되고 "이미지 저장"·"문구 복사" 버튼은 모두 `disabled={true}`임

**AC-8 [U][P1]: Scenario: 다크모드 색상**
- Given 시스템 다크모드가 활성화된 상태에서 `/share`에 진입했을 때
- Then Canvas 렌더링 코드에 HEX 리터럴이 0개이며, 배경색은 `--tds-color-background` CSS 변수 값으로 채워짐

---

### F7. 홈 · 설정 · 광고 배치 · 검수 컴플라이언스

- **Description:** 앱 진입점인 홈 화면(경조사 유형 4개 바로가기 + 최근 계산 요약 + 배너 광고), 기본 지역·목록 밀도·데이터 초기화를 다루는 설정 화면, 그리고 FloatingTabBar 기반 전역 네비게이션을 구성한다. 검수 통과를 위한 전역 규칙(콘솔 에러 0, HEX 0, 외부 이탈 0)을 이 패킷에서 검증한다.
- **Data:** `Settings`, `LastCalc`
- **API:** 없음
- **Requirements:** 탭은 홈(`/`), 기록(`/history`), 통계(`/stats`), 설정(`/settings`) 4개. 배너 광고는 홈 최근 계산 카드 아래, 히스토리 목록 하단에만 배치한다.

**AC-1 [E][P0]: Scenario: 홈에서 유형 바로 계산**
- Given `/` 홈 화면일 때
- When `장례식` 유형 카드를 탭
- Then `navigate('/calc', { state: { eventType: 'funeral' } })`가 호출되고 `/calc`에서 유형 Chip `장례식`이 선택 상태로 표시됨

**AC-2 [S][P1]: Scenario: 최근 계산 요약**
- Given `gmc:lastCalc:v1`에 `recommended: 200000` 결과가 저장되어 있을 때
- While `/` 홈 화면에 머무름
- Then `data-testid="last-calc-card"` Card에 `200,000원`과 `결혼식 · 친한 친구`가 표시되고, 탭 시 `navigate('/result', { state: { input } })` 실행

**AC-3 [S][P1]: Scenario: 최근 계산 없음**
- Given `gmc:lastCalc:v1`이 `null`일 때
- While `/` 홈 화면에 머무름
- Then `data-testid="last-calc-card"`가 렌더링되지 않고 `Asset.ContentIcon` + `첫 계산을 시작해보세요` 안내가 표시됨

**AC-4 [E][P0]: Scenario: 기본 지역 변경**
- Given `/settings`에서 `defaultRegion`이 `majorCity`일 때
- When 지역 ListRow 탭 → BottomSheet에서 `서울 강남권` 선택
- Then `gmc:settings:v1.defaultRegion === 'seoulGangnam'`으로 저장되고 Toast `기본 지역을 변경했어요` 표시

**AC-5 [E][P1]: Scenario: 전체 데이터 삭제**
- Given `gmc:records:v1`에 5건이 저장된 상태에서 `/settings`일 때
- When "모든 기록 삭제" ListRow 탭 → TDS AlertDialog에서 "삭제" 확인
- Then `gmc:records:v1`, `gmc:lastCalc:v1`, `gmc:rewardUnlock:v1`이 초기값으로 재설정되고 Toast `모든 기록을 삭제했어요` 표시

**AC-6 [U][P0]: Scenario: 광고 비침범 배치**
- Given `/` 홈과 `/history` 화면이 렌더링되었을 때
- Then `AdSlot`은 각 화면에서 정확히 1개 렌더링되며, DOM 상 `data-testid="last-calc-card"`(홈) / 목록 마지막 ListRow(히스토리) **다음 형제 노드**로 배치되고, `position: fixed`나 `z-index` 오버레이 스타일을 갖지 않음
- And `/result`, `/share` 화면에는 `AdSlot`이 렌더링되지 않음

**AC-7 [U][P0]: Scenario: 검수 규칙 정적 검증**
- Given `src/**/*.{ts,tsx,css}` 전체를 스캔했을 때
- Then 정규식 `#[0-9a-fA-F]{3,8}\b` 매치 0건, `window.open|window.location.href` 매치 0건, `google-analytics|amplitude|mixpanel` 매치 0건, `설치|다운로드받` 문구 매치 0건임

**AC-8 [W][P1]: Scenario: 라우팅 오류 처리**
- Given 존재하지 않는 경로 `/unknown`으로 진입했을 때
- Then `NotFound` 화면에 `페이지를 찾을 수 없어요` 텍스트와 `홈으로 가기` TDS Button(display="block")이 표시되고, 탭 시 `navigate('/', { replace: true })` 실행, `console.error` 호출 없음

---

## Screen Definitions

### S1. Home — `/`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top(title="축의금 계산기"), TDS ListRow ×4(경조사 유형 바로가기), Card(`data-testid="last-calc-card"`), TDS Paragraph.Text, TDS Spacing, Asset.ContentIcon(빈 상태), FloatingTabBar, AdSlot
- **Loading:** storage `ready === false` → 유형 리스트 자리에 TDS Skeleton 4행, 최근 계산 Card 자리에 Skeleton 1개
- **Empty:** `gmc:lastCalc:v1 === null` → Asset.ContentIcon + `첫 계산을 시작해보세요`
- **Error:** storage 파싱 실패 → 기본값 렌더 + Toast `저장된 데이터를 불러오지 못했어요`
- **Touch:** 유형 ListRow 높이 ≥ 56px, FloatingTabBar 아이템 44×44px 이상
- **Navigation state contract:**
  - Outgoing: 유형 카드 탭 → `navigate('/calc', { state: { eventType: EventType } })`
  - Outgoing: 최근 계산 Card 탭 → `navigate('/result', { state: { input: CalcInput } })`
  - Incoming: `location.state = null`
- **Layout contract:** ScreenScaffold 루트. 순서 = Top → 유형 ListRow 그룹 → Spacing(size=16) → `last-calc-card` Card → Spacing(size=16) → AdSlot → FloatingTabBar. 1차 액션 없음(리스트 자체가 액션).

### S2. Calculator — `/calc`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top(뒤로가기), TDS Chip 그룹 ×5(유형/관계/친밀도/참석/지역), TDS Paragraph.Text(그룹 라벨), TDS Spacing, SubmitFooter + TDS Button(display="block", size="large")
- **Loading:** `ready === false` → 지역 그룹 Skeleton, 버튼 disabled
- **Empty:** 해당 없음(선택지는 상수)
- **Error:** 잘못된 `location.state` → 빈 폼 렌더(예외 없음)
- **Touch:** Chip 래퍼 `min-height: 44px`, Chip 간 gap 8px(커스텀 flex 허용), SubmitFooter 버튼 높이 48px
- **Keyboard:** 텍스트 입력 없음 → 키보드 미노출. FloatingTabBar는 이 화면에서 숨김.
- **Navigation state contract:**
  - Incoming: `location.state = { eventType: EventType } | null`
  - Outgoing: 계산 버튼 → `navigate('/result', { state: { input: CalcInput } })`
- **Layout contract:** ScreenScaffold 루트, 1차 액션은 SubmitFooter 고정. Chip 그룹은 `data-testid="group-eventType" | "group-relation" | "group-intimacy" | "group-attendance" | "group-region"`.

### S3. Result — `/result`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top, SummaryHero(CountUp, `data-testid="recommend-hero"`), Card ×2(`range-card`, `breakdown-card`), TDS ListRow ×5(breakdown), TDS Chip(조건 요약 배지), TDS Paragraph.Text(고지), SubmitFooter + TDS Button ×2
- **Loading:** CountUp 진행(600ms) 중에도 숫자 텍스트 유지
- **Empty:** 해당 없음(state 없으면 리다이렉트)
- **Error:** state 손상 → Toast 후 `/calc` replace 이동
- **Touch:** SubmitFooter 주 버튼 48px, 보조 버튼("공유 카드 만들기") 48px
- **Navigation state contract:**
  - Incoming: `location.state = { input: CalcInput } | null` (null이면 `gmc:lastCalc:v1` 폴백)
  - Outgoing: 기록 저장 → `navigate('/record/new', { state: { prefill: { eventType: EventType; relation: RelationType; amount: number } } })`
  - Outgoing: 공유 → `navigate('/share', { state: { result: CalcResult } })`
- **Layout contract:** ScreenScaffold 루트. 순서 = Top → `recommend-hero`(t2 이상 강조 + 조건 Chip 배지) → `range-card` Card → `breakdown-card` Card → 고지 Paragraph.Text → SubmitFooter. **AdSlot 없음**(핵심 가치 화면 비침범).

### S4. Record New — `/record/new`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top, TDS TextField ×3(이름/금액/메모), TDS Chip 그룹 ×3(유형/관계/방향), 날짜 선택 TDS ListRow → TDS BottomSheet, TDS Spacing, SubmitFooter + TDS Button(display="block")
- **Loading:** 저장 중 버튼 `loading` 상태 + `disabled`
- **Empty:** 해당 없음
- **Error:** 필드별 에러 메시지(AC-2, AC-3), 저장 실패 시 TDS AlertDialog
- **Touch:** TextField 높이 ≥ 48px, ListRow ≥ 56px, Chip ≥ 44px
- **Keyboard:** 이름 필드 자동 포커스(prefill 진입 시), 금액 필드 `inputMode="numeric"`, 마지막 필드 `enterKeyHint="done"`. 키보드 노출 시 SubmitFooter가 `visualViewport.height` 기준으로 위로 이동해 활성 입력 필드를 가리지 않는다.
- **Navigation state contract:**
  - Incoming: `location.state = { prefill: { eventType: EventType; relation: RelationType; amount: number } } | null`
  - Outgoing: 저장 성공 → `navigate('/history', { replace: true })`

### S5. History — `/history`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top(우측 "추가" 액션), TDS Tab(전체/줌/받음 필터), TDS ListRow(기록 항목), TDS BottomSheet(항목 액션), TDS AlertDialog(삭제 확인), Asset.ContentIcon(빈 상태), FloatingTabBar, AdSlot
- **Loading:** `ready === false` → ListRow Skeleton 5행
- **Empty:** `data-testid="history-empty"` — Asset.ContentIcon + `아직 기록이 없어요` + `첫 기록 추가하기` Button(display="block")
- **Error:** 삭제 실패 → Toast `삭제하지 못했어요. 다시 시도해주세요`
- **Scroll:** 최신순 정렬, 초기 20건 렌더 → IntersectionObserver 센티넬 도달 시 20건씩 추가. 총 건수 상한 1,000건이므로 최대 DOM 노드 1,000행, 가상 스크롤 미사용(항목 높이 고정 64px 기준 메모리 안전).
- **Touch:** ListRow ≥ 64px, Top 우측 액션 44×44px
- **Navigation state contract:**
  - Incoming: `location.state = null`
  - Outgoing: 추가 → `navigate('/record/new', { state: null })`
- **Layout contract:** ScreenScaffold 루트. AdSlot은 목록 마지막 ListRow의 다음 형제로 1회 렌더.

### S6. Stats — `/stats`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top, Card ×3, SummaryHero(CountUp 평균), Sparkline(`data-testid="trend-sparkline"`), MiniBar(`data-testid="type-minibar"`), TDS ListRow(유형별 상세), TossRewardAd(게이트), TDS Button(display="block", "상세 리포트 보기"), Asset.ContentIcon, FloatingTabBar
- **Loading:** `ready === false` → Card 3개 Skeleton, 버튼 disabled
- **Empty:** 기록 0건 → Asset.ContentIcon + `기록이 3건 이상 쌓이면 리포트를 볼 수 있어요`(광고 게이트 미렌더)
- **Error:** 광고 로드 실패/중도 이탈 → Toast, 잠금 유지
- **Touch:** "상세 리포트 보기" 버튼 48px
- **Navigation state contract:**
  - Incoming: `location.state = null`
  - Outgoing: 없음(탭 이동만)
- **Layout contract:** ScreenScaffold 루트. 게이트 밖에 무료 요약 Card(총 건수·총 금액), 게이트 안 `data-testid="stats-detail"`에 SummaryHero + Sparkline Card + MiniBar Card.

### S7. Share — `/share`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top, Card(캔버스 미리보기 래퍼), `<canvas data-testid="share-canvas">`, SubmitFooter + TDS Button ×2("이미지 저장" display="block", "문구 복사")
- **Loading:** `isRendering === true` → 캔버스 위 Skeleton, 버튼 2개 모두 disabled
- **Empty:** 해당 없음(state 없으면 리다이렉트)
- **Error:** 클립보드 실패 / toBlob 실패 → Toast
- **Touch:** 버튼 각 48px
- **Navigation state contract:**
  - Incoming: `location.state = { result: CalcResult } | null`
  - Outgoing: state 없음 → `navigate('/calc', { replace: true })`
- **Layout contract:** ScreenScaffold 루트, 미리보기는 Card로 감싸고 aspect-ratio 1:1 커스텀 CSS 허용. AdSlot 없음.

### S8. Settings — `/settings`
- **TDS 컴포넌트:** ScreenScaffold, TDS Top, TDS ListRow(기본 지역, 모든 기록 삭제), TDS Switch(목록 간략히 보기), TDS BottomSheet(지역 선택), TDS AlertDialog(삭제 확인), TDS Paragraph.Text(버전·고지), FloatingTabBar
- **Loading:** `ready === false` → ListRow Skeleton 3행
- **Empty:** 해당 없음
- **Error:** 설정 저장 실패 → Toast `설정을 저장하지 못했어요`
- **Touch:** ListRow ≥ 56px, Switch 터치 영역 44×44px
- **Navigation state contract:**
  - Incoming: `location.state = null`
  - Outgoing: 없음(탭 이동만)
- **Layout contract:** ScreenScaffold 루트, 외부 링크 0개(법률 고지 텍스트는 인앱 Paragraph.Text로만 표기).

### S9. NotFound — `*`
- **TDS 컴포넌트:** ScreenScaffold, Asset.ContentIcon, TDS Paragraph.Text(`페이지를 찾을 수 없어요`), TDS Button(display="block", `홈으로 가기`)
- **Navigation state contract:** Outgoing: `navigate('/', { replace: true })`

---

## API Contract

**외부 API 호출 없음.** 본 앱은 전 기능이 클라이언트 로컬 연산 + localStorage로 완결된다.

- 외부 HTTP 요청 0건 → CORS 이슈 발생 여지 0.
- 사용하는 앱인토스 SDK 호출은 다음뿐이다:
  - `getIsTossLoginIntegratedService(): Promise<boolean>` — 연동 상태 확인용(선택적, 실패 시 `false`로 폴백하고 기능 제한 없음)
  - `TossAds.attachBanner` (템플릿 `AdSlot` 내부)
  - `TossAds.loadFullScreenAd` / `showFullScreenAd` (템플릿 `TossRewardAd` 내부)
- 향후 서버 도입 시 통일 에러 shape은 `{ error: string }`으로 고정한다(현 MVP 미해당).

---

## Assumptions

1. **AI 미사용:** 금액 산출은 결정적 규칙(계수 곱 + 사다리 스냅) 기반이며 LLM·생성형 AI를 사용하지 않는다. 따라서 "이 서비스는 생성형 AI를 활용합니다" 고지는 표시하지 않는다(허위 고지 방지). 대신 CP-7의 참고값 고지를 표시한다. 향후 AI 코멘트 기능 추가 시 고지 ACs를 신설한다.
2. **계수 값의 근거:** 표의 baseAmount·factor 값은 국내 경조사 관례를 단순화한 초기 파라미터이며, PRD에 외부 통계 출처가 명시되지 않아 앱 상수로 하드코딩한다. 값 변경은 상수 파일 1곳 수정으로 가능하도록 분리한다.
3. **지역 물가 반영:** 실시간 물가 API를 쓰지 않고 4단계 지역 구간 상수로 근사한다(서버 없음 제약).
4. **결과 화면은 게이트하지 않는다:** 핵심 가치인 권장 금액은 무료 즉시 노출하고, 리워드 광고는 통계 상세 리포트(F5)에만 적용한다. 핵심 가치 게이트는 이탈률과 검수 리스크를 높인다.
5. **기록 상한 1,000건:** localStorage 5MB 대비 안전 마진 확보용. 초과 시 신규 저장 거부.
6. **리워드 해제 24시간:** 시청 1회당 24시간 해제. PRD에 기간 명시가 없어 리텐션·수익 균형 기본값으로 설정.
7. **공유는 인앱 완결:** 외부 SNS 딥링크 금지 정책에 따라 이미지 저장/문구 복사만 제공한다. 실제 SNS 게시는 유저가 앱 밖에서 수행한다.
8. **날짜/시간:** 단말 로컬 타임존 기준. 서버 시각 동기화 없음.
9. **다국어:** 한국어 단일 로케일.
10. **프로모션 리워드·IAP 미사용:** PRD 수익 모델이 광고 단독이므로 `grantPromotionReward`, `TossPurchase`는 MVP에서 사용하지 않는다.

---

## Open Questions

1. **계수 파라미터 검증** — baseAmount/relationFactor 값의 실제 관례 부합도를 검증할 데이터 출처(설문·공개 통계)가 있는가? 없다면 초기 상수로 출시 후 피드백으로 조정할 것인가?
2. **리워드 해제 기간** — 24시간이 적정한가, 아니면 세션 단위(앱 재진입 시 재시청) 또는 7일이 나은가? 수익/UX 트레이드오프 결정 필요.
3. **경조사 유형 확장 범위** — PRD의 "확장"에 승진·집들이·백일 등을 MVP에 포함할 것인가, 4종(결혼/장례/돌잔치/개업)으로 고정할 것인가?
4. **받은 금액 기록의 위치** — `direction: 'received'`를 F4 기록에 통합했는데, 별도 "받은 내역" 탭으로 분리할 필요가 있는가?
5. **기록 상한 도달 시 정책** — 신규 저장 거부 대신 오래된 기록 자동 아카이브/삭제가 필요한가?
6. **부부 합산·직계 가족 케이스** — "부부 동반 참석" 같은 추가 계수를 MVP에 넣을 것인가? 현재는 미포함.
7. **광고 그룹 ID 분리** — 홈 배너와 히스토리 배너를 동일 `VITE_TOSS_AD_GROUP_ID`로 쓸 것인가, 별도 지면 ID를 콘솔에서 발급받을 것인가?