ialog`(삭제 확인 · **🆕 중복 저장 확인**), `Toast`, `Button`, `Asset.ContentIcon`, `Skeleton`, `FloatingTabBar`
- **레이아웃 계약**: `ScreenScaffold` 골격. 목록 상단에 기간 요약 `Card` 1개(`data-testid="history-summary"`: 이번 달 총액·건수). "기록 추가" FAB는 우하단 고정(56×56px), `FloatingTabBar` 위 16px 여백.
- **상태**
  - Loading: Skeleton ListRow 5개, FAB `disabled`
  - Empty: `Asset.ContentIcon` + "아직 기록이 없어요" + "기록 추가하기" 버튼 / 필터 결과 0건 → "{행사명} 기록이 없어요"
  - Error(413/507): 저장 실패 Toast(F1 AC-5, AC-6), BottomSheet 유지
  - **🆕 Conflict(409-중복)**: `AlertDialog` "같은 날짜에 같은 이름의 기록이 이미 있어요" + "그래도 새 기록으로 저장할까요?" + [취소/저장]. BottomSheet는 열린 채 입력값 유지(F5 AC-10)
  - **🆕 Conflict(409-동시수정)**: Toast "다른 화면에서 이미 수정된 기록이에요. 새로고침 후 다시 시도해주세요" + BottomSheet 닫힘 + 목록 최신값 갱신(F5 AC-13)
  - **🆕 End of list(416)**: 마지막 항목 아래 "모든 기록을 다 봤어요" 1회 표시(F5 AC-11)
- **스크롤**: 레코드 ≤ 100건이면 일반 렌더, > 100건이면 윈도잉으로 초기 마운트 30개 이하(F5 AC-7). 목록 컨테이너는 세로 스크롤, Tab 헤더는 sticky. `offset`은 `[0, records.length]`로 클램프(F5 AC-11).
- **키보드**: BottomSheet 내 금액/날짜 `inputMode="numeric"`, 포커스 시 시트가 키보드 높이만큼 상승해 "저장" 버튼 비가림 보장(F5 AC-4)
- **터치**: ListRow 높이 ≥ 56px, FAB 56×56px, BottomSheet "저장" 버튼 ≥ 52px
- **오버레이 수명주기 🆕**: 탭 이동·뒤로가기 시 열린 BottomSheet/AlertDialog는 전부 닫히고 입력값은 폐기되며 `body` 스크롤 잠금이 해제된다(F5 AC-12)
- **광고**: `AdSlot` 1개 — 목록 **끝(마지막 항목 아래)**. 목록 중간 삽입 금지, `FloatingTabBar`와 겹침 금지.
- **Navigation state contract**
  - Incoming: `location.state = { prefill: CalcInput & { recommendedAmount: number } } | null` (prefill 있으면 BottomSheet 자동 오픈)
  - Outgoing: ListRow 탭 → `navigate('/history/' + record.id)`

### S5. 히스토리 상세 — `/history/:id`

- **TDS 컴포넌트**: `Top`(뒤로가기), `ListRow`(항목별 상세 6행), `Paragraph.Text`, `Chip`(행사·관계 배지), `Button`(수정/삭제), `AlertDialog`, `BottomSheet`(수정 폼), `Toast`
- **레이아웃 계약**: `ScreenScaffold` 골격. `data-testid="record-detail-card"` Card 1개에 금액(t3 강조) + 상세 행. 하단 `SubmitFooter`에 "수정하기"(primary, `display="block"`) 배치, "삭제"는 텍스트 버튼.
- **상태**
  - Loading: Skeleton 카드 1개
  - Empty/Error(404): `:id`에 해당하는 레코드가 없으면 정확히 "삭제되었거나 없는 기록이에요" + "목록으로" 버튼 표시(흰 화면 금지)
  - **🆕 Conflict(409)**: 수정 저장 시 `baseUpdatedAt` 불일치면 Toast "다른 화면에서 이미 수정된 기록이에요. 새로고침 후 다시 시도해주세요" 후 최신값 재조회(F1 AC-11)
  - **🆕 404 during edit**: 수정 시트가 열린 상태에서 다른 탭이 해당 레코드를 삭제하면, 저장 시 `{ code: 404 }` → Toast "삭제되었거나 없는 기록이에요" + `navigate('/history', { replace: true })`
- **터치**: 모든 버튼 높이 ≥ 48px
- **광고**: 없음
- **Navigation state contract**
  - Incoming: `useParams<{ id: string }>()`만 사용, `location.state` 미사용
  - Outgoing: 삭제 확정 후 → `navigate('/history', { replace: true })`

### S6. 통계 리포트 — `/stats`

- **TDS 컴포넌트**: `Top`(타이틀 "통계"), `Paragraph.Text`, `Chip`, `Button`, `Skeleton`, `Asset.ContentIcon`, `Toast`, `FloatingTabBar` + 템플릿 `SummaryHero`(CountUp), `Sparkline`, `MiniBar`, `TossRewardAd`, `AdSlot`
- **레이아웃 계약**: `ScreenScaffold` 골격. 최상단 `SummaryHero`(총 지출, CountUp) 1개. `data-testid="stat-card"` Card 2개 이상(요약 지표 3종 / 행사 유형 비중 `MiniBar`). 추이는 `data-testid="trend-sparkline"` `Sparkline` 1개. 상세는 `data-testid="detail-stats"`.
- **상태**
  - Loading: Hero Skeleton 1개 + 카드 Skeleton 2개
  - Empty: 0건 → `Asset.ContentIcon` + "기록이 없어 통계를 만들 수 없어요" + "기록 추가하러 가기"
  - Locked: 상세 영역 블러 미리보기 + "광고 보고 상세 리포트 열기"(수치 텍스트 DOM 미렌더)
  - Error(500): 광고 실패 Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"
  - **🆕 401**: 토스 앱 외부 실행 시 해제 버튼 대신 "토스 앱에서 광고를 보면 상세 리포트를 열 수 있어요"(F8 AC-10)
  - **🆕 동기화**: 다른 탭에서 기록이 변경되면 `subscribeRecords`로 집계가 재계산된다(F1 AC-13)
- **터치**: 해제 버튼 높이 ≥ 48px
- **광고**: `AdSlot` 1개 — 요약 카드와 상세 통계 섹션 **사이**. `TossRewardAd`가 `detail-stats`를 게이트.
- **Navigation state contract**
  - Incoming: 없음
  - Outgoing: "기록 추가하러 가기" → `navigate('/history', { state: { prefill: null } })`

### S7. 공유 카드 — `/share`

- **TDS 컴포넌트**: `Top`(뒤로가기), `Paragraph.Text`, `Chip`(행사·관계 배지), `Button`(SubmitFooter "결과 복사하기"), `Toast`, `Skeleton`, `Spacing`
- **레이아웃 계약**: `ScreenScaffold` 골격. `data-testid="share-card"` Card 1개(3:4 비율 컨테이너, 커스텀 CSS flex 허용) 안에 배지 → 권장 금액(t2 이상) → 권장 범위 → "참고용 권장 금액이에요" 캡션 순서.
- **상태**
  - Loading: 카드 자리 Skeleton 1개
  - Empty/Error(404 등가): `location.state === null` → `/`로 replace 리다이렉트
  - Error(500): 복사 실패 Toast "복사에 실패했어요. 화면을 캡처해 공유해주세요"
- **터치**: 복사 버튼 ≥ 52px, 뒤로가기 ≥ 44px
- **광고**: 없음(공유 카드 캡처 영역 오염 방지)
- **Navigation state contract**
  - Incoming: `location.state = { input: CalcInput, result: CalcResult }` (null이면 `/`로 replace)
  - Outgoing: 뒤로가기 → `navigate(-1)`

### S8. 설정 — `/settings`

- **TDS 컴포넌트**: `Top`(타이틀 "설정"), `ListRow`(기본 지역/앱 버전/모든 기록 삭제), `Switch`(물가 보정 기본값), `BottomSheet`(지역 선택), `AlertDialog`(삭제 확인), `Toast`, `Skeleton`, `FloatingTabBar`
- **레이아웃 계약**: `ScreenScaffold` 골격. ListRow 그룹 2개(계산 기준 / 데이터 관리)를 섹션 헤더로 구분. ListRow에 padding prop 없음 — 간격은 `Spacing`으로만.
- **상태**
  - Loading: Skeleton ListRow 3개
  - Empty: 기록 0건 → "모든 기록 삭제" ListRow `disabled`
  - Error(500/507): 설정 저장 실패 Toast + **확인 후 반영 패턴**으로 UI가 이전 값 유지(F8 AC-5, AC-12)
  - **🆕 Saving**: 저장 요청 진행 중 해당 Switch/ListRow는 `disabled`(중복 요청 방지, F8 AC-12)
- **터치**: 모든 ListRow 높이 ≥ 56px, Switch 터치 영역 ≥ 44×44px
- **광고**: 없음
- **Navigation state contract**
  - Incoming: 없음
  - Outgoing: 없음(탭 이동은 `FloatingTabBar`가 담당)

---

## API Contract

**해당 없음.** MVP는 외부 API를 호출하지 않는다. 모든 데이터는 `localStorage`에, 모든 계산은 클라이언트 순수 함수(F2)에 존재한다.

- 네트워크 요청은 정적 자산과 토스 SDK(광고) 호출만 허용된다 → CORS 설정 불필요, CORS 에러 0건(F8 AC-9).
- **오류 계약은 서버 없이도 존재한다.** 위 **Error Model** 표의 `AppErrorCode`가 그 계약이며, 향후 원격 API를 붙일 때 HTTP 상태 코드를 그대로 `AppErrorCode`에 매핑해 UI 문구를 재사용한다(문구 변경 불필요).
- 향후 "전국 평균 실지출 데이터" 같은 원격 데이터가 필요해지면 별도 Railway API 서버를 신설하고, 아래 형태를 따른다(현 스코프 밖):
  - `GET /v1/benchmarks?eventType=wedding&region=seoul` → `{ eventType: string; region: string; median: number; p25: number; p75: number; updatedAt: string }`
  - 에러 응답은 통일 형태 `{ error: string }`, 상태 코드 `400` (잘못된 쿼리) / `404` (데이터 없음) / `500` (서버 오류)
  - 클라이언트는 응답 상태 코드를 `AppErrorCode`로 그대로 사용한다.

---

## Work Packet Mapping (참고)

| Feature | 예상 패킷 수 | 비고 |
|---|---|---|
| F1 데이터 저장 계층 | 2 | ①순수 모듈+errors.ts+테스트 ②🆕 ID/중복/충돌(409·404) + subscribeRecords |
| F2 계산 엔진 | 1 | 순수 함수 + 테이블 테스트 |
| F3 홈 & 계산 입력 | 2 | 홈 / 입력 폼(+region 보존 AC-9) |
| F4 결과 + 리워드 게이트 | 2 | 결과 레이아웃 / 광고 게이트+상세 리포트 |
| F5 히스토리 | 4 | 목록·필터(+416 끝 도달) / 추가·수정 시트(+409 중복 다이얼로그) / 상세·삭제(+404) / 🆕 오버레이 수명주기+동시수정 |
| F6 통계 리포트 | 2 | 집계 함수+요약 / 상세 시각화+게이트 |
| F7 공유 카드 | 1 | 카드 렌더 + 복사 |
| F8 설정 & 정책 점검 | 2 | ①설정 화면(+확인 후 반영 롤백) ②🆕 401/403 환경·격리 가드 + 검수 체크 |
| **합계** | **16** | MIN 4 패킷 충족 |

---

## Assumptions

1. **AI 미사용**: 계산은 고정 룰 테이블 기반 결정론 함수다. 생성형 AI 결과물이 없으므로 AI 사전 고지·결과물 라벨 AC는 포함하지 않는다. 추후 "AI 추천 문구" 같은 기능이 추가되면 해당 고지 AC를 반드시 신설해야 한다.
2. **기준표 수치의 근거**: PRD에 구체적 금액 기준이 없어 국내 일반 관례(3만/5만/10만 단위)를 바탕으로 SPEC에서 확정했다. 이 표는 코드 상수 `src/lib/rules.ts`에 격리해 이후 조정이 1파일 수정으로 끝나게 한다.
3. **리워드 해제 기간 24시간**: PRD에 미명시. 재방문 유도와 광고 노출의 균형을 위해 24시간으로 확정했다.
4. **레코드 상한 1,000건**: 5MB 한도 대비 여유가 크지만, 가상 스크롤 없는 렌더 성능과 JSON 직렬화 비용을 고려한 실용적 상한이다.
5. **공유는 앱 내부 카드 + 클립보드 텍스트**: 토스 검수 정책상 외부 도메인 이탈·외부 공유 SDK를 쓸 수 없어, 이미지 파일 저장/SNS 직접 공유는 MVP 범위에서 제외한다.
6. **광고 ID**: `VITE_TOSS_AD_GROUP_ID`(배너), `VITE_TOSS_AD_SLOT_ID`(리워드)는 앱인토스 콘솔에서 발급되어 env로 주입된다. 값이 비어 있으면 광고 컴포넌트는 아무것도 렌더하지 않고 레이아웃도 무너지지 않아야 한다.
7. **IAP 미사용**: 수익 모델이 광고 단독이므로 `TossPurchase`는 이번 MVP에서 사용하지 않는다.
8. **프로모션 리워드 미사용**: `grantPromotionReward` 호출부는 MVP에 0건이다(F8 AC-8).
9. **날짜 입력**: 네이티브 date picker 대신 TDS `TextField` + `inputMode="numeric"` 8자리(YYYYMMDD) 입력 후 포맷팅으로 처리한다(Android 7 호환).
10. **🆕 HTTP 상태 코드의 의미**: 서버가 없으므로 상태 코드는 네트워크 응답이 아니라 **오류 분류자(`AppErrorCode`)**로만 쓰인다. 숫자를 HTTP와 동일하게 맞춘 이유는 (a) 리뷰·QA가 익숙한 어휘로 케이스를 검증할 수 있고, (b) 향후 원격 API 도입 시 매핑 비용이 0이기 때문이다. UI에는 코드 숫자를 절대 노출하지 않고 `error` 문구만 노출한다.
11. **🆕 401은 차단이 아니라 성능 저하(graceful degradation)**: 토스 앱 밖에서 실행돼도 계산·기록·통계 등 로컬 기능은 전부 동작한다. 광고·리워드 기능만 비활성화하고 안내 문구를 띄운다. 로그인 화면을 만들지 않는다(토스 정책).
12. **🆕 403은 "방어적 상수"**: 단일 사용자 로컬 저장이라 실제 타 사용자 접근은 OS/브라우저 오리진 격리로 이미 불가능하다. 403 AC는 (a) 앱이 `gmc:` 외 키를 만지지 않음, (b) 스토리지 접근이 한 파일로 격리됨을 **정적으로 검증**하기 위한 계약이다.
13. **🆕 중복 저장은 거부가 아니라 확인**: 같은 사람에게 같은 날 두 번 낼 수 있는 실제 상황(예: 축의금 + 화환)을 막지 않기 위해, 409는 `force: true` 재시도로 우회 가능한 **소프트 차단**으로 설계했다.
14. **🆕 낙관적 잠금 키는 `updatedAt`**: 별도 버전 필드를 두지 않고 기존 `updatedAt`(epoch ms)을 비교 키로 재사용한다. 동일 ms 내 연속 수정이 겹칠 확률은 단일 디바이스 사용 패턴에서 무시 가능하다.
15. **🆕 설정 저장은 "확인 후 반영"**: 낙관적 UI 업데이트를 쓰지 않는다. localStorage 쓰기는 동기·수 ms이므로 지연 체감이 없고, 실패 시 UI/저장값 불일치가 원천 차단된다.

---

## Open Questions

1. **기준 금액표 검증**: F2의 기준표/배수 값을 실제 관례 데이터로 재검증할 계획이 있는가? (있다면 릴리스 전 상수 교체 패킷 1개 추가 필요)
2. **리워드 해제 범위**: 리워드 1회 시청으로 `/result` 상세와 `/stats` 상세를 **동시에** 해제하는 현재 설계가 맞는가, 아니면 화면별로 각각 해제해야 하는가? (현 SPEC은 `rewardUnlockedUntil` 단일 플래그로 동시 해제)
3. **부의금 명칭 처리**: 장례식 선택 시 UI 문구를 "축의금"이 아닌 "부의금"으로 전부 치환해야 하는가? (현 SPEC은 중립어 "경조사비"로 통일)
4. **받은 기록(수증) 지원**: PRD는 "누구에게 얼마 줬는지"만 명시했다. 받은 금액 기록(`direction: 'received'`)은 v2로 미루는 것이 맞는가?
5. **시즌 스파이크 대응**: 결혼·명절 시즌 재방문 유도 장치(예: 다가오는 경조사 D-day 표시)를 MVP에 넣을지, v2로 미룰지?
6. **공유 카드 이미지 저장**: 텍스트 복사만으로 바이럴 목표를 달성할 수 있는가? 이미지 저장이 필수라면 토스 웹프레임워크가 제공하는 저장/공유 API 존재 여부 확인이 선행돼야 한다.
7. **🆕 중복 판정 기준의 세밀도**: `personName|eventDate|eventType` 조합이 적절한가? 동명이인이 같은 날 다른 결혼식을 하는 경우 오탐이 나는데, `relationship`까지 키에 포함할지 결정 필요.
8. **🆕 토스 앱 외부 실행 정책**: F8 AC-10은 "기능 제한 + 안내"로 설계했다. 검수 기준상 토스 앱 밖 실행 시 **완전 차단 화면**을 요구하는지 콘솔 정책 확인이 필요하다(요구 시 AC-10을 차단형으로 교체).
9. **🆕 409 중복 확인의 빈도**: 실제 사용에서 중복 다이얼로그가 너무 자주 뜨면 마찰이 된다. 릴리스 후 `force: true` 선택률이 70%를 넘으면 중복 감지 자체를 제거하는 것을 검토한다.

---

## 변경 이력 (v1.0 → v1.1)

| # | 항목 | 코드 | 위치 | 상태 |
|---|---|---|---|---|
| 1 | 인증/토스 앱 외부 실행 | **401** | F8 AC-10 | 🆕 신규 |
| 2 | 타 사용자 데이터 접근 차단 | **403** | F8 AC-11 | 🆕 신규 |
| 3 | ID 충돌 방지 및 실패 처리 | **409** | F1 AC-9 | 🆕 신규 |
| 4 | 동일 인물·날짜 중복 기록 | **409** | F1 AC-10 / F5 AC-10 | 🆕 신규 |
| 5 | 동시 수정 충돌(낙관적 잠금) | **409** | F1 AC-11 / F5 AC-13 | 🆕 신규 |
| 6 | 없는 레코드 수정·삭제 | **404** | F1 AC-12 | 🆕 신규 |
| 7 | 탭 간 변경 구독 | N/A | F1 AC-13 | 🆕 신규 |
| 8 | region 보존/무효값 대체 | **422** | F3 AC-9 | 🆕 신규 |
| 9 | 목록 끝 도달·offset 클램프 | **416** | F5 AC-11 | 🆕 신규 |
| 10 | 오버레이 수명주기(탭 전환) | N/A | F5 AC-12 | 🆕 신규 |
| 11 | 설정 저장 실패 UI 롤백 | **500/507** | F8 AC-12 | 🆕 신규 |
| 12 | 오류 문구 단일 소스 강제 | 전체 | AC-G9 | 🆕 신규 |
| 13 | 저장 한도 초과 반환값에 code 추가 | **413** | F1 AC-5 | ✏️ 수정 |
| 14 | 쿼터 초과 반환값에 code 추가 | **507** | F1 AC-6 | ✏️ 수정 |
| 15 | `AppErrorCode`/`Result` 타입 | — | Data Models | 🆕 신규 |
| 16 | Error Model 표 | — | 신규 섹션 | 🆕 신규 |