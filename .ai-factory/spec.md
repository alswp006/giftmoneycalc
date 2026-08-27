# 경조사비 추천 미니앱 — SPEC (수정판 v2)

> 본 문서는 1차 리뷰 5개 이슈 + 2차 계약 정합성 리뷰 지적(광고 식별자 용어 혼동)을 반영한 완전판이다. 변경 요약은 문서 말미 **[변경 이력]** 참조.

---

## 0. 범위 (Scope)

**MVP 포함:** 룰 기반 경조사비 추천 계산, 계산 결과 저장, 로컬 히스토리 조회/삭제/재계산, 로컬 통계(리워드 광고 게이트), 공유 카드 이미지 생성, 배너 광고, 온보딩·에러 처리 및 검수 대응.

**MVP 제외:** 기기 간 동기화/백업, 푸시 알림, 서버 저장소, 커뮤니티 비교(전국 평균 대비 내 금액). 특히 커뮤니티 비교 기능은 외부 API 서버를 필요로 하므로 MVP 범위 밖이며, 그 경우의 계약 초안은 Open Questions Q3 참조.

---

## 1. 데이터 모델 (Normative)

> **[이슈 #1 대응]** F1/F5/A7/A9가 참조하는 로컬 저장 엔티티를 타입 스키마로 명시한다. 아래 정의는 규범적(normative)이며, F1·F5의 AC는 이 정의를 기준으로 판정한다.

### 1.1 열거형

```ts
// src/domain/types.ts
export const EVENT_TYPES = ['WEDDING', 'FUNERAL', 'FIRST_BIRTHDAY', 'OPENING'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const RELATIONS = [
  'FAMILY',        // 가족
  'RELATIVE',      // 친척
  'CLOSE_FRIEND',  // 절친
  'FRIEND',        // 친구
  'COWORKER',      // 직장동료
  'ACQUAINTANCE',  // 지인
] as const;
export type Relation = (typeof RELATIONS)[number];

/** 저장된 데이터에서 읽어올 때 사용하는 관대한(lenient) 타입.
 *  런타임 값이 위 유니온에 없을 수 있음을 타입 레벨에서 인정한다. */
export type StoredEventType = EventType | (string & {});
export type StoredRelation = Relation | (string & {});
```

### 1.2 `HistoryRecord`

```ts
export type HistoryRecord = {
  /** UUID v4. crypto.randomUUID() 우선, 미지원 시 A9 폴백. 저장소 내 유일. */
  id: string;
  /** 저장 시점의 유형. 읽기 시 알 수 없는 값일 수 있다(F5 AC-9). */
  eventType: StoredEventType;
  /** 저장 시점의 관계. 읽기 시 알 수 없는 값일 수 있다(F5 AC-9). */
  relation: StoredRelation;
  /** 사용자가 실제 낸 금액(원, 정수). 1 이상 10_000_000 이하. */
  amount: number;
  /** 계산 엔진이 산출한 추천 금액(원, 정수). 재계산 비교용. */
  recommendedAmount: number;
  /** 행사 참석 여부 */
  attended: boolean;
  /** 동반 인원(본인 제외). 0 이상 9 이하 정수. */
  companions: number;
  /** 행사 날짜. 'YYYY-MM-DD' (로컬 달력 기준). */
  eventDate: string;
  /** 상대 표기(선택). 최대 20자. 공유 카드에는 미포함(Q5). */
  counterpartLabel?: string;
  /** 메모(선택). 최대 100자. */
  memo?: string;
  /** 계산에 사용된 룰 테이블 버전. 현재 1. 재계산 시 diff 판정 근거. */
  ruleVersion: number;
  /** 생성 시각. ISO 8601 UTC (예: '2026-08-28T05:12:33.417Z'). */
  createdAt: string;
  /** 최종 수정 시각. ISO 8601 UTC. 생성 시 createdAt과 동일 값. */
  updatedAt: string;
};
```

### 1.3 저장소 키 & 버저닝

```ts
export const SCHEMA_VERSION = 1 as const;

export const STORAGE_KEYS = {
  records:  'gyeongjo:v1:records',   // RecordsEnvelope
  settings: 'gyeongjo:v1:settings',  // SettingsEnvelope
  reward:   'gyeongjo:v1:reward',    // RewardEnvelope
  onboard:  'gyeongjo:v1:onboarded', // '1' | 미존재
} as const;

/** 손상 데이터 격리 백업 키 접두사. 예: 'gyeongjo:corrupt:records' */
export const CORRUPT_KEY_PREFIX = 'gyeongjo:corrupt:';

export type RecordsEnvelope = {
  schemaVersion: number;   // 저장 시 SCHEMA_VERSION
  updatedAt: string;       // ISO 8601 UTC
  records: HistoryRecord[]; // 최대 500개 (A7)
};

export type SettingsEnvelope = {
  schemaVersion: number;
  defaultRelation?: Relation;
  defaultAttended?: boolean;
};

export type RewardEnvelope = {
  schemaVersion: number;
  /** 마지막 리워드 광고 시청 완료 시각(epoch ms, Date.now() 기준 — A5). */
  lastUnlockedAt: number;
};
```

**버저닝 규칙**

| 상황 | 동작 |
|---|---|
| 읽은 `schemaVersion === SCHEMA_VERSION` | 그대로 사용 |
| 읽은 `schemaVersion < SCHEMA_VERSION` | `migrate(from, to)` 순차 적용 → 저장 → 사용 |
| 읽은 `schemaVersion > SCHEMA_VERSION` (다운그레이드) | 읽기 전용으로 취급, **덮어쓰기 금지**, 빈 목록 반환 + 안내 Toast |
| `schemaVersion` 누락/비정수 | 손상으로 간주 → 1.4 손상 처리 |
| 키 자체가 없음 | 빈 Envelope(`records: []`)로 초기화 |

**마이그레이션 등록부:** `migrations: Record<number, (prev: unknown) => unknown>`. 신규 필드는 항상 optional 또는 기본값을 갖도록 추가하며, **기존 필드 삭제·의미 변경 시에만** `SCHEMA_VERSION`을 올린다.

### 1.4 손상 데이터 처리

`JSON.parse` 실패 또는 Envelope 스키마 불일치 시: 원본 문자열을 `gyeongjo:corrupt:records` 로 이동 보존 → 원 키를 빈 Envelope로 재초기화 → 사용자에게 "기록을 불러오지 못했습니다" Toast. **원본은 절대 즉시 삭제하지 않는다.**

### 1.5 룰 테이블 (`ruleVersion = 1`)

```ts
export const BASE_AMOUNT: Record<EventType, number> = {
  WEDDING: 50_000, FUNERAL: 50_000, FIRST_BIRTHDAY: 30_000, OPENING: 50_000,
};
export const RELATION_MULTIPLIER: Record<Relation, number> = {
  FAMILY: 4.0, RELATIVE: 2.0, CLOSE_FRIEND: 2.0,
  FRIEND: 1.0, COWORKER: 1.0, ACQUAINTANCE: 0.6,
};
export const MEAL_COST: Record<EventType, number> = {
  WEDDING: 30_000, FUNERAL: 20_000, FIRST_BIRTHDAY: 30_000, OPENING: 20_000,
};
export const MIN_AMOUNT = 30_000;
export const MAX_AMOUNT = 1_000_000;
```

**공식**

```
raw   = BASE_AMOUNT[eventType] * RELATION_MULTIPLIER[relation]
      + (attended ? MEAL_COST[eventType] * (1 + companions) : 0)
snapped = ceil(raw / 10_000) * 10_000           // 만원 단위 올림
result  = clamp(snapped, MIN_AMOUNT, MAX_AMOUNT)
```

### 1.6 광고 식별자 (Normative)

> **[이슈 #6 대응]** `AdSlot` / `TossRewardAd` 가 서로 다른 prop 이름(`adGroupId` vs `slotId`)을 쓰는 것은 **오타가 아니라 서로 다른 광고 상품**이기 때문이다. 아래 표가 규범이며 F4 AC-2·F6 AC-3·A8·F8 AC-7은 이 정의를 참조한다.

| 컴포넌트 | prop | 환경변수 | 광고 상품 | 콘솔 발급 단위 | 사용 화면 |
|---|---|---|---|---|---|
| `<AdSlot>` | `adGroupId` | `VITE_TOSS_AD_GROUP_ID` | 배너(디스플레이) | **광고 그룹(ad group)** — 그룹 단위 노출 페이싱 | `/result` 하단 (F4 AC-2) |
| `<TossRewardAd>` | `slotId` | `VITE_TOSS_AD_SLOT_ID` | 리워드 전면 영상 | **슬롯(slot)** — 슬롯 단위 지면 | `/stats` 상세 게이트 (F6 AC-3) |

**규범 규칙**
1. 두 식별자는 앱인토스 콘솔의 **별개 등록 항목**이며 값이 서로 다르다. 한쪽 값을 다른 쪽 prop에 전달하는 것은 계약 위반이다.
2. `adGroupId` 를 `slotId` 로, 또는 그 반대로 **이름을 통일하지 않는다** — SDK 래퍼(`AdSlot`, `TossRewardAd`)의 prop 시그니처가 각각 그대로 유지된다.
3. 두 값 모두 코드 리터럴 하드코딩 금지, `import.meta.env` 경유만 허용(A8, F8 AC-7).
4. 환경변수가 비어 있으면(`undefined` / `''`) 해당 광고 영역은 **렌더하지 않고** 나머지 화면은 정상 동작한다(F4 AC-8, F6 AC-9).

---

## 2. Features & Acceptance Criteria

> **[이슈 #4 대응]** F1–F8의 AC 전문을 본 문서에 포함한다. 각 Feature는 AC 4개 이상, 그중 실패/이상 동작(Unwanted behavior) AC 2개 이상을 갖는다.
> EARS 분류 표기: **[U]** Ubiquitous(항상) / **[E]** Event-driven(WHEN) / **[S]** State-driven(WHILE) / **[O]** Optional(WHERE) / **[X]** Unwanted behavior(IF…THEN)

---

### F1. 저장소 레이어 (`src/storage/`)

`HistoryRecord` CRUD와 Envelope 버저닝을 담당하는 순수 모듈. UI 의존성 없음.

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F1 AC-1** | [U] | `saveRecord(input)` 는 §1.2 스키마의 모든 필수 필드(`id`, `eventType`, `relation`, `amount`, `recommendedAmount`, `attended`, `companions`, `eventDate`, `ruleVersion`, `createdAt`, `updatedAt`)를 포함한 객체를 저장한다. 필수 필드가 하나라도 `undefined`/`null` 이면 저장하지 않고 `{ ok: false, code: 'INVALID_RECORD', field: '<필드명>' }` 을 반환한다. 유닛 테스트: 11개 필수 필드 각각을 제거한 11 케이스 전부 `ok === false`. |
| **F1 AC-2** | [E] | WHEN 신규 저장이 호출되면, `id` 는 정규식 `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/` 를 만족하고, `createdAt === updatedAt` 이며 두 값 모두 `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/` 를 만족한다. |
| **F1 AC-3** | [E] | WHEN 기존 레코드를 `updateRecord(id, patch)` 로 수정하면, `id` 와 `createdAt` 은 변경 전 값과 바이트 단위로 동일하고 `updatedAt` 은 갱신된다. `patch` 에 `id`/`createdAt` 이 포함되어 있어도 무시한다(테스트로 검증). |
| **F1 AC-4** | [X] | IF 저장된 레코드 수가 이미 500건일 때 신규 저장이 호출되면, THEN 저장하지 않고 `{ ok: false, code: 'RECORD_LIMIT_EXCEEDED' }` 를 반환하며, 저장소의 기존 500건은 한 건도 변경/삭제되지 않는다(저장 전후 JSON 문자열 동일). 자동 삭제(FIFO)는 **하지 않는다** — A7대로 수동 삭제 유도. |
| **F1 AC-5** | [X] | IF `localStorage.getItem` 결과가 `JSON.parse` 에 실패하거나 Envelope 스키마(§1.3)에 맞지 않으면, THEN §1.4에 따라 원본을 `gyeongjo:corrupt:records` 로 복사한 뒤 빈 목록을 반환하고, 예외를 상위로 던지지 않는다(호출부가 크래시하지 않음). |
| **F1 AC-6** | [X] | IF `localStorage.setItem` 이 `QuotaExceededError`(또는 이름이 `NS_ERROR_DOM_QUOTA_REACHED`) 를 던지면, THEN `{ ok: false, code: 'QUOTA_EXCEEDED' }` 를 반환하고 앱은 크래시하지 않으며 호출 화면은 Toast "저장 공간이 부족합니다"를 노출한다. |
| **F1 AC-7** | [E] | WHEN 읽은 Envelope의 `schemaVersion` 이 `SCHEMA_VERSION` 보다 작으면, 등록된 마이그레이션을 순차 적용한 결과를 저장하고 반환한다. `schemaVersion` 이 더 크면 §1.3 표대로 **덮어쓰지 않고** 빈 목록을 반환한다(다운그레이드 데이터 보호). |
| **F1 AC-8** | [O] | WHERE `crypto.randomUUID` 가 `undefined` 인 환경이면, A9의 `Math.random` 기반 폴백이 사용되며 생성 값 역시 AC-2의 UUID v4 정규식을 만족한다. 폴백 구현은 `src/storage/` 내부에만 존재하고 `src/domain/` 에서 import되지 않는다(소스 스캔 테스트로 검증 — F2 AC-1과의 비충돌 보장). |

---

### F2. 계산 엔진 (`src/domain/calculate.ts`)

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F2 AC-1** | [U] | **결정론:** `calculate(input)` 는 동일 입력에 대해 항상 동일 출력을 반환한다. 임의 입력 1건을 100회 호출한 결과의 `JSON.stringify` 가 100개 모두 동일해야 한다. 또한 `src/domain/**` 소스에 `Date.now`, `new Date`, `Math.random`, `crypto.` 문자열이 **0회** 등장해야 한다(정적 스캔 테스트). *(A4·A9가 참조하는 조항)* |
| **F2 AC-2** | [U] | 반환 타입은 `{ recommended: number; breakdown: { base: number; relationMultiplier: number; mealCost: number; companions: number; subtotal: number; rounded: number; clamped: boolean }; ruleVersion: 1 }` 이며, `recommended` 는 §1.5 공식 결과와 정확히 일치하는 10,000의 배수 정수다. |
| **F2 AC-3** | [U] | **골든 케이스 6종**이 아래 표와 정확히 일치한다(테스트 파일에 하드코딩). ①결혼/친구/미참석/0 → **50,000** ②결혼/친구/참석/0 → **80,000** ③결혼/직장동료/참석/1 → **110,000** ④장례/친척/미참석/0 → **100,000** ⑤돌잔치/지인/참석/0 → **48,000→50,000**(만원 올림) ⑥개업/가족/참석/2 → **260,000** |
| **F2 AC-4** | [U] | 클램프: 계산 결과가 30,000 미만이면 30,000, 1,000,000 초과면 1,000,000 을 반환하며 `breakdown.clamped === true` 다. 클램프가 발생하지 않은 경우 `clamped === false`. |
| **F2 AC-5** | [X] | IF `companions` 가 정수가 아니거나 0 미만 또는 9 초과이면, THEN `RangeError` 를 던지며 메시지에 `'companions'` 문자열을 포함한다. 저장/렌더는 발생하지 않는다. |
| **F2 AC-6** | [X] | IF `eventType` 또는 `relation` 이 `EVENT_TYPES` / `RELATIONS` 에 없는 값이면, THEN `TypeError`(메시지에 해당 값 원문 포함)를 던지고 임의의 기본값으로 **조용히 대체하지 않는다**. (읽기 경로의 관대한 처리는 F5 AC-9에서 별도로 정의 — 계산 입력 경로는 엄격.) |
| **F2 AC-7** | [X] | IF `attended === false` 이면 THEN `breakdown.mealCost === 0` 이며 `companions` 값과 무관하게 결과가 동일하다(참석=false, companions 0~9 총 10케이스 결과 동일). |

---

### F3. 계산 입력 화면 (`/calculate`)

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F3 AC-1** | [U] | 화면은 TDS `Top`, `Chip`(경조사 유형 4종 / 관계 6종), `Switch`(참석 여부), `TextField`(동반 인원, `inputMode="numeric"`), `Button`(CTA "추천 금액 보기")만으로 구성된다. shadcn/MUI/AntD/Chakra import가 0건이며, TDS 컴포넌트에 `style`/`className` 로 `padding`·`margin` 을 지정한 곳이 0건이다(F8 AC-6 린트로 검증). 간격은 `Spacing size={...}` 로만 조절한다. |
| **F3 AC-2** | [S] | WHILE 경조사 유형 또는 관계가 미선택 상태이면, CTA 버튼은 `disabled` 이고 탭해도 화면 전환이 발생하지 않는다. 두 값이 모두 선택되는 즉시 `disabled` 가 해제된다. |
| **F3 AC-3** | [E] | WHEN CTA를 탭하면, `react-router-dom` 의 `navigate('/result', { state: input })` 로 이동하며 입력값 5종(`eventType`, `relation`, `attended`, `companions`, `eventDate`)이 모두 전달된다. |
| **F3 AC-4** | [O] | WHERE `settings.defaultRelation` / `defaultAttended` 가 저장되어 있으면, 화면 진입 시 해당 값이 프리필된다. 없으면 관계 미선택 + 참석 `true` 가 초깃값이다. |
| **F3 AC-5** | [X] | IF 동반 인원 입력에 숫자 외 문자가 입력되면, THEN 해당 문자는 필드에 반영되지 않고(값은 직전 유효값 유지) CTA는 활성 상태를 유지한다. 9 초과 입력 시 값은 9로 고정되고 헬퍼 텍스트 "최대 9명"이 노출된다 — F2 AC-5의 예외가 UI에서 절대 발생하지 않음을 보장. |
| **F3 AC-6** | [X] | IF 결과 화면에서 브라우저/앱 뒤로가기로 복귀하면, THEN 직전 입력 5종이 그대로 복원되어 있고 폼이 초기화되지 않는다. |
| **F3 AC-7** | [U] | 모든 탭 가능 요소의 히트 영역은 최소 44×44 px 이며, 텍스트 대비는 4.5:1 이상이다(§3 비기능 요건). |

---

### F4. 결과 화면 (`/result`)

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F4 AC-1** | [E] | WHEN 화면이 마운트되면, 히어로 영역에 `recommended` 금액이 `#,###원` 포맷으로 1회 렌더되고, 그 아래 breakdown 카드에 `base`, `relationMultiplier`, `mealCost × (1+companions)`, `rounded` 4개 항목이 `ListRow` 로 각각 표시된다. |
| **F4 AC-2** | [U] | 화면 하단에 **배너 광고** `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 가 1개 배치되며, 히어로 금액·CTA와 겹치지 않는다(배너는 스크롤 컨테이너 하단 고정, CTA 아래). 여기서 쓰이는 식별자는 §1.6 표의 **광고 그룹 ID**(`VITE_TOSS_AD_GROUP_ID`)이며, F6이 쓰는 리워드 **슬롯 ID**와 서로 다른 콘솔 등록 항목이다 — 두 값을 교차 사용하면 실패로 판정한다(테스트: `AdSlot` 에 전달된 prop이 `VITE_TOSS_AD_GROUP_ID` 임을 검증). 코드에 광고 ID 리터럴 하드코딩 0건(A8, F8 AC-7). |
| **F4 AC-3** | [E] | WHEN "이 금액으로 기록하기"를 탭하면 TDS `BottomSheet` 가 열리고, 실제 낸 금액(`TextField`, 기본값=추천 금액)·상대 표기(선택, 20자 제한)·메모(선택, 100자 제한)를 입력한 뒤 저장 시 F1 `saveRecord` 가 정확히 1회 호출된다. |
| **F4 AC-4** | [X] | IF `saveRecord` 가 `RECORD_LIMIT_EXCEEDED` 를 반환하면, THEN `AlertDialog` "기록은 최대 500건까지 저장할 수 있어요. 히스토리에서 오래된 기록을 삭제해 주세요."를 노출하고 확인 시 `/history` 로 이동한다. BottomSheet 입력값은 소실되지 않는다. |
| **F4 AC-5** | [X] | IF `saveRecord` 가 `QUOTA_EXCEEDED` 또는 `INVALID_RECORD` 를 반환하면, THEN Toast로 실패를 알리고 BottomSheet를 닫지 않는다(사용자가 재시도 가능). 성공 시에만 BottomSheet가 닫히고 성공 Toast가 뜬다. |
| **F4 AC-6** | [X] | IF `location.state` 가 없는 상태로 `/result` 에 직접 진입하면(웹뷰 새로고침·딥링크), THEN 빈 화면이나 크래시 대신 `/calculate` 로 `replace` 리다이렉트한다. |
| **F4 AC-7** | [E] | WHEN 실제 낸 금액이 추천 금액과 다르게 저장되면, `HistoryRecord.amount` 는 사용자 입력값을, `recommendedAmount` 는 엔진 산출값을 각각 보존한다(둘을 동일 값으로 덮어쓰지 않음). |
| **F4 AC-8** | [X] | **[이슈 #6 대응]** IF `import.meta.env.VITE_TOSS_AD_GROUP_ID` 가 `undefined` 이거나 빈 문자열이면, THEN `<AdSlot>` 을 렌더하지 않고(빈 배너 박스·로딩 스피너 잔존 금지) 히어로·breakdown·CTA는 정상 동작한다. 크래시·콘솔 에러가 발생하지 않는다(§1.6 규칙 4). 테스트: 해당 env를 `''` 로 stub한 상태에서 `/result` 렌더 → `AdSlot` 노드 0개 + CTA 클릭 정상. |

---

### F5. 히스토리 (`/history`)

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F5 AC-1** | [U] | 목록은 `eventDate` 내림차순, 동일 날짜는 `createdAt` 내림차순으로 정렬된다. 각 행은 `ListRow` 1개로 렌더되며 좌측에 유형 라벨, 우측에 `amount` 를 표시한다. |
| **F5 AC-2** | [E] | WHEN 상단 `Tab`/`Chip` 으로 유형 필터를 선택하면, 해당 `eventType` 레코드만 남고 건수 표시가 즉시 갱신된다. "전체" 선택 시 필터가 해제된다. |
| **F5 AC-3** | [U] | 레코드 500건 상태에서 최초 페인트까지 렌더되는 DOM 행 수는 30개 이하이며(윈도잉), 스크롤 시 추가 로드된다. 500건 목록 진입~첫 렌더가 로컬 측정에서 400ms 이내다. **본 목록은 서버 엔드포인트가 아닌 클라이언트 사이드 윈도잉이므로 API 페이지네이션 계약 대상이 아니다(§5.3 참조).** |
| **F5 AC-4** | [E] | WHEN 행을 탭하면 상세 화면(`/history/:id`)이 열리고 `HistoryRecord` 의 `eventType`, `relation`, `amount`, `recommendedAmount`, `attended`, `companions`, `eventDate`, `memo`, `createdAt` 이 모두 표시된다. |
| **F5 AC-5** | [E] | WHEN 상세에서 "삭제"를 탭하면 `AlertDialog` 확인 단계를 거치며, 확인 시에만 해당 `id` 1건이 제거되고 다른 레코드 수는 변하지 않는다. 취소 시 저장소 JSON은 바이트 단위로 불변이다. |
| **F5 AC-6** | [E] | WHEN 상세에서 "다시 계산"을 탭하면 현재 `ruleVersion` 의 룰로 재계산한 값과 저장된 `recommendedAmount` 를 나란히 보여준다. "갱신" 확인 시 `recommendedAmount`, `ruleVersion`, `updatedAt` 만 변경되고 `amount`, `id`, `createdAt` 은 불변이다. |
| **F5 AC-7** | [S] | WHILE 저장된 레코드가 0건이면, 목록 대신 빈 상태(일러스트 + "첫 기록을 남겨보세요" + `/calculate` 이동 버튼)를 렌더하며 필터 Chip은 숨긴다. |
| **F5 AC-8** | [X] | IF 삭제/갱신 중 F1이 `QUOTA_EXCEEDED` 등 실패를 반환하면, THEN 화면의 목록 상태를 낙관적으로 변경한 부분을 롤백하고 Toast "처리하지 못했어요. 다시 시도해 주세요."를 노출한다. 롤백 후 화면 목록과 저장소 내용이 일치한다. |
| **F5 AC-9** | [X] | **[이슈 #2 대응 — 하위 호환]** IF 레코드의 `eventType` 이 `EVENT_TYPES` 에 없는 값(예: 향후 추가될 `'PROMOTION'`, 또는 손상된 `'???'`)이면, THEN ①목록·상세·필터 라벨은 **"기타"** 로 렌더하고 ②크래시·빈 행·`undefined` 표시가 발생하지 않으며 ③원본 문자열은 저장소에서 **변경·삭제되지 않고 그대로 보존**된다(해당 레코드를 삭제 외 경로로 수정해도 `eventType` 원본 유지) ④상세 화면에서 재계산을 시도하면 F2 AC-6에 따라 실패하므로 "이 기록은 현재 버전에서 다시 계산할 수 없어요" 안내를 띄우고 저장소를 변경하지 않는다. 동일 규칙을 알 수 없는 `relation` 값에도 적용한다. 테스트: 미지의 `eventType` 을 가진 픽스처 1건을 주입 후 목록 렌더 → "기타" 표시 + 저장소 원본 문자열 동일 검증. *(Q6의 확장 여부와 무관하게 지금 계약된다.)* |

---

### F6. 통계 + 리워드 게이트 (`/stats`)

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F6 AC-1** | [U] | `aggregate(records)` 는 순수 함수로, `{ totalCount, totalAmount, avgAmount, byEventType: Record<string, {count:number; sum:number}>, monthly: Array<{ym:string; sum:number}> }` 를 반환한다. 동일 입력 → 동일 출력이며 내부에서 `Date.now`/`Math.random` 을 사용하지 않는다(정적 스캔). |
| **F6 AC-2** | [U] | 요약 카드는 총 건수, 총 지출액, 건당 평균(원 단위 반올림)을 표시하며, `avgAmount = round(totalAmount / totalCount)` 가 화면 값과 일치한다. |
| **F6 AC-3** | [S] | WHILE 마지막 리워드 시청 이후 24시간이 지나지 않았으면(`Date.now() - reward.lastUnlockedAt < 86_400_000`), 상세 분석(월별 MiniBar, 유형별 Sparkline)이 광고 게이트 없이 바로 노출된다. 24시간이 지났거나 기록이 없으면 **리워드 전면 영상** `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 로 감싼 잠금 상태로 노출된다. 여기서 쓰이는 식별자는 §1.6 표의 **슬롯 ID**(`VITE_TOSS_AD_SLOT_ID`)이며, F4의 배너 **광고 그룹 ID**와 서로 다른 콘솔 등록 항목이다 — 두 값을 교차 사용하면 실패로 판정한다(테스트: `TossRewardAd` 에 전달된 prop이 `VITE_TOSS_AD_SLOT_ID` 임을 검증). |
| **F6 AC-4** | [E] | WHEN 리워드 광고 시청이 완료되면, `reward.lastUnlockedAt = Date.now()` 가 저장되고 상세 분석이 **화면 새로고침 없이** 즉시 렌더된다. |
| **F6 AC-5** | [X] | IF 광고 로드/표시에 실패하면(SDK 에러, 네트워크 없음), THEN 요약 카드는 계속 정상 노출되고 상세 영역에는 "광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." + 재시도 버튼이 표시된다. 화이트 스크린·크래시가 발생하지 않으며 `lastUnlockedAt` 은 갱신되지 않는다. |
| **F6 AC-6** | [X] | IF 사용자가 광고를 끝까지 보지 않고 닫으면, THEN `lastUnlockedAt` 은 갱신되지 않고 상세 분석은 잠금 상태를 유지하며, 재시도 버튼이 다시 활성화된다. |
| **F6 AC-7** | [X] | **[이슈 #5 대응 — 기기 시각 롤백]** IF 기기 시스템 시각이 과거로 변경되어 `Date.now() - reward.lastUnlockedAt` 이 음수가 되면, THEN MVP는 **롤백을 탐지하지 않으며** 해당 상태를 "잠금 해제 유지"로 취급한다(음수 < 86,400,000 이므로 해제 상태). 즉 **시각 조작에 의한 조기/연장 해제는 의도된 미방어 동작**이며 버그로 간주하지 않는다(A5). 단 다음 두 가지는 반드시 성립한다: ①`lastUnlockedAt` 이 미래 시각(양수, `lastUnlockedAt > Date.now()`)이어도 화면이 크래시하거나 "잠금 해제까지 -N시간" 같은 음수 문자열을 노출하지 않는다 — 남은 시간 표기는 `max(0, …)` 로 클램프한다. ②`lastUnlockedAt` 이 비수(非數)/`NaN`/누락이면 잠금 상태(게이트 노출)로 폴백한다. 테스트: `lastUnlockedAt` 을 (a) `Date.now() + 86_400_000` (b) `NaN` (c) `undefined` 로 주입한 3케이스에서 각각 크래시 없음 + (b)(c)는 게이트 노출. |
| **F6 AC-8** | [S] | WHILE 저장된 레코드가 0건이면, 통계 대신 빈 상태를 렌더하고 리워드 광고 게이트를 노출하지 않는다(가치 없는 광고 시청 방지). |
| **F6 AC-9** | [X] | **[이슈 #6 대응]** IF `import.meta.env.VITE_TOSS_AD_SLOT_ID` 가 `undefined` 이거나 빈 문자열이면, THEN 상세 분석을 **게이트 없이 그대로 노출**하고(광고를 띄울 수 없는데 잠그면 기능이 영구 차단되므로) `TossRewardAd` 노드를 렌더하지 않으며 크래시하지 않는다(§1.6 규칙 4). 테스트: 해당 env를 `''` 로 stub → `TossRewardAd` 노드 0개 + MiniBar/Sparkline 렌더됨. |

---

### F7. 공유 카드 (`/share/:id` 또는 결과 화면 진입)

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F7 AC-1** | [U] | 카드는 `<canvas>` 로 1080×1080 px, `devicePixelRatio` 반영하여 렌더되며 포함 정보는 **금액·경조사 유형·관계·앱 워터마크 4종뿐**이다. `counterpartLabel`, `memo`, 날짜는 렌더되지 않는다(Q5 결정 반영). 스냅샷 테스트로 텍스트 노드 4종만 존재함을 검증. |
| **F7 AC-2** | [O] | WHERE `typeof navigator.share === 'function'` 이면 "공유하기" 버튼이 `navigator.share({ files: [png] })` 를 호출한다. |
| **F7 AC-3** | [X] | IF `navigator.share` 가 미지원이면(A6), THEN 버튼 라벨이 "이미지 저장"으로 바뀌고 카드 하단에 "이미지를 길게 눌러 저장하세요" 안내 텍스트가 노출된다. 크래시나 무반응 탭이 발생하지 않는다. |
| **F7 AC-4** | [X] | IF `navigator.share` 가 `AbortError` 로 reject되면(사용자 취소), THEN 에러 Toast를 띄우지 않고 조용히 원 화면을 유지한다. 그 외 에러는 Toast "공유하지 못했어요"를 노출한다. |
| **F7 AC-5** | [U] | 카드 생성 전 과정에서 네트워크 요청이 0건이다(A6). 테스트: `fetch`/`XMLHttpRequest` 스파이가 호출되지 않음. |

---

### F8. 앱 셸 · 컴플라이언스

| ID | EARS | Acceptance Criteria (pass/fail) |
|---|---|---|
| **F8 AC-1** | [U] | `react-router-dom` 라우트는 `/`(홈=계산 입력), `/result`, `/history`, `/history/:id`, `/stats`, `*`(NotFound) 6개다. 각 경로 직접 진입 시 해당 화면이 렌더된다. |
| **F8 AC-2** | [U] | 하단 네비게이션은 템플릿 제공 `src/components/FloatingTabBar` 로 구현하며 탭은 계산·기록·통계 3개다. TDS에 없는 `TabBar` 를 임의 구현하거나 `Tab` 을 하단 네비로 전용하지 않는다(소스 스캔). |
| **F8 AC-3** | [E] | WHEN `localStorage['gyeongjo:v1:onboarded']` 가 없으면 첫 진입 시 온보딩 다이얼로그가 1회 노출되고, 본문에 "참고용 기준값" 문구(A1)가 포함된다. 닫으면 키가 `'1'` 로 저장되어 재진입 시 다시 뜨지 않는다. |
| **F8 AC-4** | [X] | IF 하위 트리에서 렌더 예외가 발생하면, THEN 에러 바운더리가 흰 화면 대신 "일시적인 오류가 발생했어요" + "홈으로" 버튼을 렌더한다. 테스트: 의도적으로 throw하는 자식 컴포넌트 주입 시 폴백 UI 렌더 확인. |
| **F8 AC-5** | [X] | IF 정의되지 않은 경로로 진입하면, THEN NotFound 화면(홈 이동 버튼 포함)이 렌더되며 빈 화면이나 무한 리다이렉트가 발생하지 않는다. |
| **F8 AC-6** | [U] | **검수 정적 검증 ①:** 소스 전체에서 `shadcn`, `@mui/`, `antd`, `@chakra-ui/` import가 0건이고, TDS 컴포넌트 JSX에 `className`/`style` 로 `padding|margin|gap` 을 지정한 곳이 0건이다. CI 테스트로 실패 시 빌드 차단. |
| **F8 AC-7** | [U] | **검수 정적 검증 ②:** 광고/IAP 식별자는 `import.meta.env.VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`, `VITE_TOSS_IAP_SKU` 로만 참조되며, 소스에 ID 형태 리터럴 하드코딩이 0건이다(A8). **추가로 §1.6 매핑을 정적으로 강제한다:** `AdSlot` JSX의 `adGroupId` prop 값이 `VITE_TOSS_AD_GROUP_ID` 이외인 경우 0건, `TossRewardAd` JSX의 `slotId` prop 값이 `VITE_TOSS_AD_SLOT_ID` 이외인 경우 0건. 위반 시 CI 실패. |
| **F8 AC-8** | [U] | **검수 정적 검증 ③:** 존재하지 않는 SDK API(`useTossAd`, `loadAdMob`, `showAdMob`) 및 커스텀 로그인 호출(`login(`, `signIn(`)이 소스에 0건이다(A3). |
| **F8 AC-9** | [U] | 모든 인터랙티브 요소의 터치 타깃은 44×44 px 이상, 본문 텍스트 명도 대비는 4.5:1 이상이다. 주요 5개 화면에 대해 수동 체크리스트로 검증하고 결과를 기록한다. |
| **F8 AC-10** | [U] | **생성형 AI 미사용 검증:** 소스 전체에서 LLM/생성형 AI 호출(`anthropic`, `openai`, `generativelanguage`, `/v1/messages`, `/v1/chat/completions`)이 0건이고, `src/domain/` 은 F2 AC-1의 결정론 스캔을 통과한다. 따라서 생성형 AI 사전 고지·결과물 라벨 UI를 두지 않는다. *(A4가 참조하는 조항)* |
| **F8 AC-11** | [U] | **환경변수 문서화 검증:** 리포지토리 루트의 `.env.example` 에 `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`, `VITE_TOSS_IAP_SKU` 3개 키가 모두 존재하고, 각 키 위에 §1.6 표의 용도(배너=광고 그룹 / 리워드=슬롯 / IAP=SKU)를 설명하는 주석 1줄 이상이 있다. 실제 값은 비워 둔다. CI 테스트로 키 존재·주석 존재를 검증한다. |

---

## 3. 비기능 요건 (Non-functional)

- **성능:** 500건 히스토리 첫 렌더 400ms 이내(F5 AC-3), 계산→결과 화면 전환 200ms 이내.
- **접근성:** 터치 타깃 44px, 대비 4.5:1을 계약(F8 AC-9). `aria-label` 수준은 Q7 미결.
- **오프라인:** 광고 영역을 제외한 전 기능이 네트워크 없이 동작한다(계산·저장·히스토리·공유 카드).
- **모바일 전용:** 세로 모드 기준, 최소 폭 320px에서 가로 스크롤이 발생하지 않는다.

---

## 4. Assumptions

- **A1.** 금액 룰 테이블(`BASE_AMOUNT`, 배수, 식대)은 국내 통념 기준의 초기값이며, 실데이터 검증 없이 코드 상수로 고정한다. 이 값이 "정답"이 아님을 온보딩 다이얼로그에서 "참고용 기준값"으로 고지한다. *(검증: F8 AC-3)*
- **A2.** 사용자 1인 1기기 사용을 전제한다. 기기 간 동기화·백업·복원 기능은 MVP 범위 밖이며, 앱 삭제 시 `localStorage` 데이터가 소실됨을 감수한다.
- **A3.** 토스 앱이 사용자 세션을 자동 제공하므로 별도 로그인/회원가입 화면을 만들지 않는다. 사용자 식별자를 저장소 키에 포함하지 않는다(기기 단위 저장). *(검증: F8 AC-8)*
- **A4.** 추천 금액 산출은 결정론적 룰 기반이며 생성형 AI를 사용하지 않는다. 따라서 생성형 AI 사전 고지·결과물 라벨 의무 대상이 아니다(F8 AC-10으로 검증).
- **A5.** 리워드 광고 해제 기간 24시간은 `Date.now()` 기준 로컬 시각으로 판정한다. 기기 시각 변경으로 조기 해제가 가능하지만, 유료 재화가 아니므로 MVP에서는 방어하지 않는다. **이 미방어 동작은 F6 AC-7에 기대 동작으로 명문화되어 있으며, 동시에 음수/미래 시각으로 인한 UI 파손은 금지된다.**
- **A6.** 공유 카드 이미지는 기기 내에서만 생성·표시되며 서버 업로드가 없다. `navigator.share` 미지원 웹뷰에서는 "길게 눌러 저장" 안내로 대체한다. *(검증: F7 AC-3, F7 AC-5)*
- **A7.** 기록 상한 500건은 일반 사용자의 연간 경조사 횟수(20~30건) 대비 충분하며, 초과 사용자는 수동 삭제로 대응한다. 상한 대상 엔티티는 §1.2 `HistoryRecord` 이며 판정 로직은 F1 AC-4에 정의된다.
- **A8.** **[이슈 #6 대응 — 개정]** `AdSlot`(배너)과 `TossRewardAd`(리워드 전면 영상)는 **토스가 제공하는 서로 다른 광고 상품**이며, prop 이름이 다른 것은 오타가 아니라 발급 단위가 다르기 때문이다.
  - `AdSlot` 은 **광고 그룹(ad group)** 단위 배너 지면으로, 그룹 레벨 노출 페이싱이 적용된다 → `adGroupId` ← `VITE_TOSS_AD_GROUP_ID`.
  - `TossRewardAd` 는 **슬롯(slot)** 단위 리워드 영상 지면이다 → `slotId` ← `VITE_TOSS_AD_SLOT_ID`.
  - 두 식별자는 **앱인토스 콘솔의 서로 다른 등록 항목에서 발급**되며 값이 동일하지 않다. 한 값을 두 컴포넌트에 공유하거나 prop 이름을 임의로 통일해서는 안 된다.
  - 규범 정의는 §1.6 표, 강제 수단은 F8 AC-7(정적 검증) / F8 AC-11(`.env.example` 문서화), 누락 시 동작은 F4 AC-8·F6 AC-9에 각각 계약되어 있다.
  - 코드에 하드코딩하지 않고 환경변수로만 주입한다(재빌드 없이 콘솔 값 교체 가능).
- **A9.** `crypto.randomUUID()` 미지원 환경(구형 iOS 16 이전 일부 웹뷰)을 대비해 `Math.random` 기반 UUID v4 폴백을 둔다. 이 폴백은 계산 엔진이 아닌 저장소 레이어에만 존재하므로 F2 AC-1의 결정론 요건과 충돌하지 않는다. *(검증: F1 AC-8)*
- **A10.** MRR 추정치(약 241,000원 / DAU 2,500)는 PRD의 가정치이며 SPEC의 검증 대상이 아니다.

---

## 5. Open Questions

- **Q1. 룰 테이블 근거 출처.** `BASE_AMOUNT` 값을 공개 통계(통계청·웨딩업체 설문 등)로 뒷받침할 것인가? 뒷받침한다면 출처 표기 문구와 갱신 주기를 정해야 한다. → 미정 시 A1대로 "참고용 기준값" 고지로 진행.
- **Q2. 기록 데이터 백업.** 앱 삭제 시 데이터 소실을 사용자에게 사전 고지할 것인가? 고지한다면 어느 화면(온보딩 vs 첫 저장 시 Toast)에 노출할지 결정 필요.
- **Q3. 외부 API 서버 도입 시점.** "전국 평균 대비 내 금액" 같은 커뮤니티 비교 기능을 추가하려면 별도 Railway API 서버가 필요하다. **MVP 이후 판단**이나, 재논의 비용을 줄이기 위해 계약 초안을 상태 코드까지 확정해 둔다(§5.1~§5.3). CORS 허용 오리진 등록이 선행되어야 한다.
- **Q4. 리워드 해제 기간.** 24시간이 적정한가, 아니면 세션 단위(앱 재실행 시 재시청)로 짧게 가져가 광고 노출을 늘릴 것인가? 수익 vs 이탈 트레이드오프 결정 필요. → 변경 시 F6 AC-3의 임계값 상수만 수정하며 AC 구조는 유지.
- **Q5. 공유 카드 개인정보.** 카드에 상대방 이름을 넣을지 여부. 현재 SPEC은 금액·행사·관계만 포함하고 이름은 제외한다(F7 AC-1로 계약화). 이름 포함 옵션을 줄 경우 토글과 경고 문구가 추가로 필요하다.
- **Q6. 경조사 유형 추가 범위.** PRD의 "확장"에 승진·집들이·환갑을 포함할 것인가? 포함 시 `EventType` 유니온과 `BASE_AMOUNT` 행을 늘려야 한다. **단, 기존 저장 기록의 하위 호환(알 수 없는 `eventType` 렌더 처리)은 더 이상 미결 사항이 아니며 F5 AC-9로 지금 계약되어 있다** — F5가 MVP에 출시되어 데이터를 영속화하기 때문이다. 따라서 Q6에 남은 미결은 "어떤 유형을 추가할 것인가"뿐이다.
- **Q7. 접근성.** 스크린리더 사용자를 위한 `aria-label` 요구 수준을 어디까지 맞출 것인가? 현재 SPEC은 터치 타깃 크기와 색상 대비만 계약화했다(F8 AC-9).

### 5.1 Q3 API 계약 초안 (deferred, but frozen)

> **[이슈 #3 대응]** 서버 도입은 MVP 이후지만, 실패 모드별 HTTP 상태 코드를 지금 고정해 재논의를 막는다.

**엔드포인트:** `POST /v1/stats/aggregate`

**Request body**
```jsonc
{
  "eventType": "WEDDING",   // EVENT_TYPES 중 하나 (필수)
  "relation": "FRIEND",     // RELATIONS 중 하나 (필수)
  "amount": 80000           // 정수, 1 이상 10_000_000 이하 (필수)
}
```

**Success — `200 OK`**
```jsonc
{ "p50": 50000, "p90": 100000, "sampleSize": 1284 }
```

**Error envelope (모든 4xx/5xx 공통)**
```jsonc
{ "error": { "code": "INVALID_EVENT_TYPE", "message": "...", "field": "eventType" } }
```

**상태 코드 매핑 (규범적)**

| Status | `error.code` | 발생 조건 | 클라이언트 동작 |
|---|---|---|---|
| `200` | — | 정상 집계 | 결과 렌더 |
| `400` | `INVALID_EVENT_TYPE` | `eventType` 누락 또는 `EVENT_TYPES` 밖 | "지원하지 않는 유형" 안내, 재시도 금지 |
| `400` | `INVALID_RELATION` | `relation` 누락 또는 `RELATIONS` 밖 | 동일 |
| `400` | `INVALID_AMOUNT` | `amount` 가 정수 아님 / 범위 밖 / 누락 | 입력 보정 유도, 재시도 금지 |
| `400` | `MALFORMED_JSON` | 본문 파싱 실패 | 재시도 금지, 에러 로깅 |
| `401` | `UNAUTHENTICATED` | (인증 도입 시) 토큰 누락/만료 | 토큰 갱신 후 1회 재시도 |
| `403` | `ORIGIN_NOT_ALLOWED` | CORS 허용 오리진 미등록 | 재시도 금지, 배포 설정 오류로 보고 |
| `404` | `NOT_FOUND` | 미정의 경로/버전(`/v2/...` 등) | 재시도 금지 |
| `404` | `NO_SAMPLE` | 조합에 해당하는 표본이 0건 | "아직 비교할 데이터가 부족해요" 빈 상태 |
| `422` | `SAMPLE_TOO_SMALL` | 표본 < 30건 (통계 신뢰도 미달) | `sampleSize` 안내와 함께 비교 미노출 |
| `429` | `RATE_LIMITED` | 레이트 리밋 초과 | `Retry-After` 헤더만큼 대기 후 최대 1회 재시도 |
| `500` | `AGGREGATION_FAILED` | 집계 파이프라인 예외 | 최대 1회 지수 백오프 재시도 후 폴백 |
| `503` | `UPSTREAM_UNAVAILABLE` | DB/업스트림 다운 | 동일 |

**공통 규칙:** ①타임아웃 3초, 초과 시 `503` 과 동일 취급. ②모든 실패 경로에서 **로컬 통계(F6)는 정상 노출**되고 커뮤니티 비교 섹션만 숨긴다. ③서버는 개별 `amount` 원본을 저장하지 않고 집계 버킷만 누적한다(개인정보 최소화). ④응답은 `Cache-Control: public, max-age=3600`.

### 5.2 Q3 DB 스키마 & 응답 필드 매핑 (deferred, but frozen)

> §5.1의 응답 필드가 어느 저장 컬럼에서 나오는지 지금 고정한다. **MVP에는 DB가 존재하지 않으며**(§0), 아래는 Q3 채택 시에만 생성된다.

```sql
-- 유일한 테이블. 외래키 없음(참조 대상 테이블 자체가 없음).
CREATE TABLE stats_bucket (
  event_type    TEXT    NOT NULL,   -- EVENT_TYPES 중 하나 (CHECK로 강제)
  relation      TEXT    NOT NULL,   -- RELATIONS 중 하나 (CHECK로 강제)
  p50_amount    INTEGER NOT NULL,   -- 원 단위 정수
  p90_amount    INTEGER NOT NULL,   -- 원 단위 정수
  sample_size   INTEGER NOT NULL,   -- 누적 표본 수, 0 이상
  updated_at    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (event_type, relation),
  CHECK (event_type IN ('WEDDING','FUNERAL','FIRST_BIRTHDAY','OPENING')),
  CHECK (relation IN ('FAMILY','RELATIVE','CLOSE_FRIEND','FRIEND','COWORKER','ACQUAINTANCE')),
  CHECK (sample_size >= 0 AND p50_amount >= 0 AND p90_amount >= p50_amount)
);
```

**응답 필드 ↔ 컬럼 매핑 (규범적 — 모든 응답 필드는 컬럼 1:1 대응을 갖는다)**

| 응답 필드 | 타입 | 원본 컬럼 | 비고 |
|---|---|---|---|
| `p50` | integer | `stats_bucket.p50_amount` | 그대로 반환 |
| `p90` | integer | `stats_bucket.p90_amount` | 그대로 반환 |
| `sampleSize` | integer | `stats_bucket.sample_size` | 그대로 반환 |

**요청 필드 ↔ 컬럼 매핑**

| 요청 필드 | 용도 | 대응 컬럼 |
|---|---|---|
| `eventType` | 조회 키 | `stats_bucket.event_type` (PK 일부) |
| `relation` | 조회 키 | `stats_bucket.relation` (PK 일부) |
| `amount` | 버킷 누적 입력 | 원본 미저장(§5.1 공통규칙 ③) — `p50_amount`/`p90_amount`/`sample_size` 갱신에만 사용 |

**외래키 규칙:** 본 스키마의 테이블은 `stats_bucket` 1개뿐이며 **FK를 정의하지 않는다.** `event_type`/`relation` 은 별도 참조 테이블 대신 `CHECK` 제약으로 검증한다(§1.1 열거형과 값 집합이 동일해야 하며, 열거형 변경 시 마이그레이션으로 `CHECK` 를 함께 갱신한다). 존재하지 않는 테이블을 가리키는 FK는 어떤 경우에도 추가하지 않는다.

**상태 코드 연동:** 조회 결과 행이 없으면 `404 NO_SAMPLE`, `sample_size < 30` 이면 `422 SAMPLE_TOO_SMALL` 을 반환한다(§5.1 표와 일치).

### 5.3 페이지네이션 규칙 (규범적)

- **MVP에는 목록(list) API 엔드포인트가 존재하지 않는다.** 히스토리 목록(F5)은 `localStorage` 를 읽어 클라이언트에서 윈도잉하는 화면이며 서버 요청이 0건이다(§3 오프라인 요건).
- §5.1의 `POST /v1/stats/aggregate` 는 **단건 집계 조회**로, 배열을 반환하지 않으므로 페이지네이션 대상이 아니다(응답은 스칼라 3필드 객체).
- **향후 배열을 반환하는 엔드포인트를 추가할 경우, 다음 커서 페이지네이션 계약을 반드시 따른다(예외 없음):**

```jsonc
// Request: ?limit=20&cursor=<opaque>
// Response
{
  "items": [ /* ... */ ],
  "page": {
    "limit": 20,          // 기본 20, 최대 100. 범위 밖이면 400 INVALID_LIMIT
    "nextCursor": "abc",  // 다음 페이지 없으면 null
    "hasMore": true
  }
}
```

| 규칙 | 내용 |
|---|---|
| 기본/최대 `limit` | 기본 20, 최대 100. 초과 시 `400 INVALID_LIMIT` |
| 커서 형식 | 불투명(opaque) 문자열. 클라이언트가 파싱하지 않는다 |
| 잘못된 커서 | `400 INVALID_CURSOR`, 재시도 금지 |
| 마지막 페이지 | `nextCursor: null`, `hasMore: false` |
| 정렬 안정성 | 커서 정렬 키는 유니크 컬럼(또는 유니크 튜플)을 포함해 페이지 간 중복·누락이 없어야 한다 |
| offset 페이지네이션 | **금지** — 커서 방식만 허용 |

---

## 6. Feature → Work Packet 매핑 (다운스트림 참고)

| Feature | 예상 패킷 수 | 분할 제안 |
|---|---|---|
| F1 저장소 레이어 | 1 | `storage/` 모듈(§1 스키마·버저닝·마이그레이션 포함) + 유닛 테스트 |
| F2 계산 엔진 | 1 | `domain/calculate.ts` + 골든 케이스 6종 테스트 |
| F3 계산 입력 화면 | 2 | (a) 폼 UI + Chip/Switch 조립 (b) 검증·설정 프리필·네비게이션 |
| F4 결과 화면 | 2 | (a) 히어로·breakdown 카드 렌더 (b) 저장 BottomSheet + 배너 광고 배치(§1.6 `adGroupId`, env 누락 폴백 AC-8) |
| F5 히스토리 | 2 | (a) 목록·필터·윈도잉 + 미지 `eventType` 폴백(AC-9) (b) 상세·삭제·재계산 |
| F6 통계 | 2 | (a) `aggregate()` 집계 함수 + 요약 카드 (b) 리워드 게이트(§1.6 `slotId`, 시각 롤백 클램프, env 누락 폴백 AC-9) + Sparkline/MiniBar |
| F7 공유 카드 | 1 | Canvas 렌더 + 공유/저장 분기 |
| F8 셸·컴플라이언스 | 2 | (a) 라우터·탭바·온보딩·에러 바운더리 (b) 검수 정적 검증(린트 룰 + 소스 스캔 테스트 + 광고 식별자 매핑 AC-7 + `.env.example` AC-11) |
| **합계** | **13** | MIN 4 패킷 요건 충족 |

---

## [변경 이력] — 리뷰 지적 반영

| # | 지적 | 반영 위치 |
|---|---|---|
| 1 | `HistoryRecord` 타입·저장소 키·버저닝 미정의 | **§1 데이터 모델** 신설 (§1.2 타입, §1.3 키/버저닝, §1.4 손상 처리) + F1 AC-1/2/3/7 |
| 2 | 미지 `eventType` 하위 호환 AC 부재 | **F5 AC-9** 신설 (기타 렌더 + 원본 보존 + 재계산 차단), Q6 문구 갱신 |
| 3 | Q3 API 상태 코드 매핑 없음 | **§5.1** 신설 (400/401/403/404/422/429/5xx 매핑 표 + 공통 규칙) |
| 4 | F1–F8 AC 섹션 미포함 | **§2** 신설 — 8개 Feature 전부, 각 AC 4개 이상 / 실패 AC 2개 이상, EARS 분류 표기 |
| 5 | 기기 시각 롤백 미방어가 F6 AC로 문서화 안 됨 | **F6 AC-7** 신설 (미탐지가 의도된 동작임을 명시 + 음수/NaN 클램프 요건 계약), A5 상호 참조 추가 |
| 6 | **광고 식별자 혼동** — F4 `adGroupId` vs F6 `slotId` 의 관계가 A8에 미명시 | **§1.6 광고 식별자** 신설(상품·발급 단위·prop·env 매핑 표 + 교차 사용 금지 규칙), **A8 전면 개정**, **F4 AC-2 / F6 AC-3** 에 식별자 출처 명시 + 교차 사용 실패 판정 추가, **F8 AC-7** 에 prop↔env 정적 강제 추가, **F4 AC-8 / F6 AC-9** 신설(env 누락 시 폴백), **F8 AC-11** 신설(`.env.example` 문서화 검증) |
| 7 | 계약 정합성 확인 항목(응답 필드↔컬럼, FK, 목록 페이지네이션) 미문서화 | **§5.2** 신설(`stats_bucket` 스키마 + 응답/요청 필드↔컬럼 1:1 매핑 + FK 미사용 근거), **§5.3** 신설(MVP 목록 API 부재 명시 + 향후 커서 페이지네이션 계약), **F5 AC-3** 에 "API 페이지네이션 대상 아님" 주석 추가 |

---

### 이번 수정에서 다루지 않은 것 (의도적)

- 리뷰가 "정합함"으로 판정한 항목(룰 테이블↔골든 케이스, `HistoryRecord`↔저장소 키, Q3 상태 코드, `StoredEventType` 관대 타입, 공유 카드 필드 제외)은 **변경하지 않았다.**
- 새 기능·새 엔드포인트·새 화면을 추가하지 않았다. 추가된 AC(F4 AC-8, F6 AC-9, F8 AC-11)는 모두 지적된 광고 식별자 계약을 강제하기 위한 검증 조항이다.