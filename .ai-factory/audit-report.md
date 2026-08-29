# 디자인 품질 감사 보고서

날짜: 2026-08-30
대상: giftmoneycalc-c8ra (Vite + React + TDS, 3화면: Home / ResultPage / HistoryPage)

## 요약 점수

| 항목 | 점수 (0-4) |
|---|---|
| 접근성 (Accessibility) | 3 |
| 성능 (Performance) | 3 |
| 다크모드 (Theming) | 4 |
| TDS 준수 (Design System Compliance) | 4 |

---

## 1. 접근성 (Accessibility) — 3/4

**적용한 수정 (P1)**
- `src/components/ChipGroup.tsx`: 단일 선택 칩 그룹(자리/관계/친밀도/지역/참석여부/예식장)이 `fill`/`weak` variant로만 선택 상태를 시각적으로 구분하고 있었고, 스크린리더에는 선택 여부가 전달되지 않았다. 각 버튼에 `aria-pressed={selected === option.value}`를 추가하고, 감싸는 컨테이너에 `role="group" aria-label={title}`을 추가해 라디오형 선택 그룹임을 보조기술에 노출했다. TDS `ButtonProps`는 `ComponentPropsWithoutRef<motion.button>`을 확장해 네이티브 버튼 속성을 그대로 통과시키므로 시각적 변경 없이 안전하게 추가 가능했다.
  - 수정 후 `npx tsc --noEmit`, `npx vitest run`(65 tests pass), `npx vite build` 모두 통과 확인.

**남은 이슈 (P2 — 보고만, 미수정)**
- `HistoryPage.tsx`의 기록 목록이 `<div style={{display:"flex", flexDirection:"column"}}>`로 렌더되어 시맨틱 리스트(`<ul>/<li>` 또는 TDS List 컴포넌트)가 아니다. 스크린리더가 "n개 항목 목록"이라는 정보를 제공하지 못한다. 다만 각 항목이 Card로 명확히 분리되어 있고 내용 자체는 순서대로 읽히므로 심각도는 낮다.
- 아이콘 전용 버튼(`aria-label` 필요 대상)은 코드베이스에 존재하지 않음 — 모든 버튼이 텍스트 라벨을 가짐(문제 없음).
- 명암비: 텍스트 색상이 전부 `adaptive.*` TDS 토큰(`grey600`, `grey700`, 기본 텍스트색)만 사용하며 커스텀 HEX 대비 조합이 없다. TDS 토큰 자체의 WCAG AA 충족 여부는 디자인 시스템 책임 범위로, 앱 코드에서 임의로 재정의하지 않은 점은 양호. 별도 대비 위반 발견 없음.
- 키보드 내비게이션: 모든 인터랙션 요소가 네이티브 `<button>`(TDS Button/FixedBottomCTA)이라 Tab 순서가 DOM 순서와 일치하고 논리적이다. 별도 `tabIndex` 조작이 없어 위험 요소 없음.

## 2. 성능 (Performance) — 3/4

**관찰 사항 (수정 없음 — P2/P3)**
- `ChipGroup`이 `React.memo`로 감싸여 있지 않아 부모(Home)의 매 상태 변경마다 6개 칩 그룹 전체가 리렌더된다. 다만 화면당 버튼 총량이 수십 개 수준이고 렌더 비용이 낮아 실사용 임팩트는 미미 — "just in case" memo 추가는 하지 않음(불필요한 방어 코드 금지 규칙).
- 프로덕션 번들이 1.29MB(gzip 411KB)로 500KB 경고 임계값을 초과한다. 원인은 `@toss/tds-mobile`/`@toss/tds-mobile-ait` 라이브러리 자체 크기이며, 화면이 3개뿐이라 라우트 단위 code-splitting(`React.lazy`)을 적용해도 초기 진입 시 어차피 TDS 코어를 로드해야 해 실질적인 절감 효과가 작다. 새 패키지 도입 없이 해결할 수 없는 구조적 이슈로 P3 기록만 하고 미수정.
- `lucide-react`, `@emotion/*`, `@apps-in-toss/web-framework`가 `src/` 프로덕션 코드에서 실사용되지 않는다(테스트 목 모킹에서만 참조). 다만 CLAUDE.md CRITICAL 규칙상 이 패키지들은 플랫폼 필수 의존성으로 제거가 금지되어 있어 조치하지 않음 — 실제 번들에도 포함되지 않으므로(사용하지 않으면 tree-shaking됨) 성능 영향 없음.
- 이미지 자산 없음 — lazy loading 해당 사항 없음.
- `useMemo`(Home의 relationOptions/draft, ResultPage의 result, HistoryPage의 items)가 필요한 곳에 적절히 적용되어 있음.

## 3. 다크모드 (Theming) — 4/4

- `src/` 전역에서 하드코딩 HEX 색상 검색(`#[0-9a-fA-F]{3,8}`) 결과 **0건**. 모든 색상이 `adaptive.*`(`@toss/tds-colors`) 토큰을 통해 지정됨:
  - `adaptive.background` (PageShell, Card 배경)
  - `adaptive.grey600`, `adaptive.grey700` (보조 텍스트)
  - `adaptive.greyOpacity100` (Card 테두리)
- `main.tsx`의 `TDSMobileAITProvider` 배선이 원본 그대로 유지되어 `--adaptive*` CSS 변수 자동 주입 경로가 손상되지 않음(@AI:ANCHOR 미수정 확인).
- 커스텀 CSS 파일 자체가 없고 모든 스타일이 인라인 `style` 객체 + TDS 토큰으로만 구성되어 고정 색상이 끼어들 여지가 구조적으로 차단되어 있음.

## 4. TDS 준수 (Design System Compliance) — 4/4

- 모든 화면이 `ScreenScaffold`(PageShell + top + bottom 슬롯) 골격을 사용하며 raw div로 화면을 새로 짜지 않음.
- 1차 CTA는 전부 `SubmitFooter`(`FixedBottomCTA` 기반) 또는 `display="block"` `Button`으로, 좌측 글자폭 함정 없음.
- `Button` variant는 전부 `'fill'`(암묵적 기본) 또는 `'weak'`만 사용 — 색인에 없는 variant 없음.
- `FixedBottomCTA`/`SubmitFooter` 내부에 `<Button>`을 중첩한 곳 없음(`children`에 라벨 텍스트 직접 전달).
- `ListRow` 컴포넌트를 아예 사용하지 않아 금지된 `padding` prop 오용 이슈 자체가 발생하지 않음.
- `TextField` 사용처 없음(전 화면이 칩 선택 기반 입력이라 필수 prop 누락 이슈 해당 없음).
- Tailwind 클래스(`className`) 사용 **0건** — 전부 TDS 컴포넌트 + 인라인 style(레이아웃 skeleton 용도)로만 구성.
- 커스텀 margin/padding은 `PageShell`/`ScreenScaffold`/`Card`/`ButtonStack` 등 사전 구축된 골격 컴포넌트 내부의 레이아웃 상수로만 존재하며, 화면(Home/ResultPage/HistoryPage) 레벨에서는 TDS `Spacing` 컴포넌트로 간격을 조절함(임의 margin 없음).
- `Card`에 `testId` prop을 부여해 레이아웃 테스트(`getAllByTestId`)와 연동되어 있음.

---

## 조치 내역

| 우선순위 | 항목 | 상태 |
|---|---|---|
| P1 | ChipGroup 선택 상태 스크린리더 미노출 (`aria-pressed`/`role="group"` 부재) | ✅ 수정 완료 |
| P2 | HistoryPage 기록 목록이 시맨틱 리스트가 아님 | 보고만 (미수정) |
| P2 | ChipGroup 미메모이제이션으로 인한 불필요 리렌더 가능성 | 보고만 (미수정) |
| P3 | 프로덕션 번들 500KB 경고 초과(TDS 라이브러리 자체 크기) | 보고만 (미수정) |
| P3 | lucide-react/@emotion/@apps-in-toss-web-framework 프로덕션 코드 미사용 | 보고만 (플랫폼 필수 의존성이라 제거 금지) |

## 검증
- `npx tsc --noEmit` — 통과
- `npx vitest run` — 65/65 테스트 통과
- `npx vite build` — 빌드 성공 (1,286.13 kB / gzip 411.33 kB)
