import { test, expect, type Page } from "@playwright/test";

/**
 * 제네릭 구조 스모크 — 이 앱 지식 없이도 jsdom이 못 보는 렌더 버그를 잡는다:
 *  · 흰 화면(#root 비어있음)        · <button> 안에 <button>(무효 HTML, 예: FixedBottomCTA 안에 Button)
 *  · 빈 입력칸(placeholder 없음)     · 콘솔 에러
 * 픽셀 베이스라인 없음(OS 안정). 각 화면 스크린샷을 e2e/__shots__/에 저장 → 끝내기 전 직접 열어 자가 리뷰.
 *
 * ▶ 이 앱에 맞게 customize:
 *   1) ROUTES에 핵심 화면을 추가(폼/결과/목록/설정 등)
 *   2) 데이터가 필요한 화면은 seed()에서 localStorage를 채워라
 */
const SEEDED_RECORD_ID = "seed-record-1";

// App.tsx가 정의한 라우트 전부 — 각 경로에 직접 진입(새로고침·딥링크)해도 렌더되는지 본다.
// /result는 location.state로만 진입하므로 URL 직접 진입은 홈 리다이렉트가 정상이다(F4 AC-6).
// 실제 결과 화면은 아래 "flow: 홈 → 결과" 테스트가 폼을 채워서 확인한다.
const ROUTES: { path: string; name: string }[] = [
  { path: "/", name: "home" },
  { path: "/history", name: "history" },
  { path: "/stats", name: "stats" },
  { path: `/history/${SEEDED_RECORD_ID}`, name: "history-detail" },
  { path: "/result", name: "result-direct-entry" },
  { path: "/no-such-screen", name: "notfound" },
];

/** 데이터가 필요한 화면용 localStorage 시드. 앱 스크립트보다 먼저 실행된다. */
async function seed(page: Page): Promise<void> {
  await page.addInitScript((recordId) => {
    // 온보딩은 첫 실행 1회만 뜬다 — 시드로 끄지 않으면 모든 스크린샷을 다이얼로그가 덮는다.
    window.localStorage.setItem("gyeongjo:v1:onboarded", "1");
    window.localStorage.setItem(
      "gyeongjo:v1:records",
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: "2026-08-20T00:00:00.000Z",
        records: [
          {
            id: recordId,
            eventType: "WEDDING",
            relation: "FRIEND",
            amount: 100000,
            recommendedAmount: 80000,
            attended: true,
            companions: 1,
            eventDate: "2026-08-15",
            counterpartLabel: "대학 동기",
            memo: "2차까지 참석",
            ruleVersion: 1,
            createdAt: "2026-08-15T02:00:00.000Z",
            updatedAt: "2026-08-15T02:00:00.000Z",
          },
        ],
      }),
    );
  }, SEEDED_RECORD_ID);
}

// 토스 WebView 밖(일반 브라우저)에서만 나는 알려진 dev 에러 — 무시(실기기 WebView엔 안 남)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /getSafeAreaInsets/i];

for (const route of ROUTES) {
  test(`visual smoke: ${route.name} (${route.path})`, async ({ page }) => {
    const errors: string[] = [];
    // "Failed to load resource"만으로는 무엇이 실패했는지 알 수 없다 — URL을 같이 남긴다.
    const badResponses: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
    });
    page.on("console", (m) => {
      if (m.type() === "error" && !IGNORED_CONSOLE.some((re) => re.test(m.text()))) errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));

    await seed(page);
    await page.goto(route.path);
    await page.waitForTimeout(1000); // React 렌더 + effect 정착

    // 1) 흰 화면 방지 — #root에 실제 콘텐츠가 있어야(SDK 가드 누락 시 트리 언마운트 → 흰 화면)
    const rootText = (await page.locator("#root").innerText().catch(() => "")).trim();
    expect(rootText.length, `${route.name}: #root가 비어있음 → 흰 화면`).toBeGreaterThan(0);

    // 2) <button> 안에 <button> 금지 — 무효 HTML. FixedBottomCTA/BottomCTA/CTAButton은 자체가 button이니
    //    안에 Button을 넣지 마라(SubmitFooter는 올바르게 처리됨).
    expect(
      await page.locator("button button").count(),
      `${route.name}: <button> 안에 <button>(무효 HTML — CTA류 안에 Button 중첩)`,
    ).toBe(0);

    // 3) 입력칸은 placeholder가 보여야 — box/line variant는 빈 칸+비포커스에서 라벨이 떠 숨어 빈 회색 박스가 됨
    const inputs = page.getByRole("textbox");
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const ph = (await inputs.nth(i).getAttribute("placeholder")) ?? "";
      expect(ph.trim().length, `${route.name}: 입력칸 #${i}에 placeholder 없음 → 빈 회색 박스`).toBeGreaterThan(0);
    }

    // 4) 콘솔 에러 0 (알려진 dev 에러 제외) — 토스 검수는 console.error 0개 요구
    expect(errors, `${route.name}: 콘솔 에러 (실패 응답: ${badResponses.join(", ") || "없음"})`).toEqual([]);

    // 5) 스크린샷 저장 → 끝내기 전 직접 열어 자가 리뷰(휑함/솔리드 알약 탭/부유 CTA/앵커 없음)
    await page.screenshot({ path: `e2e/__shots__/${route.name}.png`, fullPage: true });
  });
}

// 결과 화면은 URL이 아니라 홈에서 넘긴 location.state로만 열린다 — 실제 사용자 경로 그대로 확인한다.
test("flow: 홈에서 입력 후 결과 화면(/result)까지 이동한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED_CONSOLE.some((re) => re.test(m.text()))) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await seed(page);
  await page.goto("/");
  await page.getByRole("button", { name: "결혼식" }).click();
  await page.getByRole("button", { name: "친구", exact: true }).click();
  await page.getByRole("button", { name: "추천 금액 보기" }).click();
  await page.waitForTimeout(1000);

  await expect(page).toHaveURL(/\/result$/);
  const rootText = (await page.locator("#root").innerText().catch(() => "")).trim();
  expect(rootText, "/result: 추천 금액 히어로가 없음").toContain("추천 금액");
  expect(await page.locator("button button").count(), "/result: <button> 안에 <button>").toBe(0);
  // 결과는 탭 루트가 아니다 — 하단 탭 대신 CTA만 있어야 한다
  expect(await page.getByRole("tab").count(), "/result: 탭바가 노출됨").toBe(0);
  expect(errors, "/result: 콘솔 에러").toEqual([]);

  await page.screenshot({ path: "e2e/__shots__/result.png", fullPage: true });
});
