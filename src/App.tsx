import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { RecordsProvider } from '@/state/RecordsProvider';
import Home from '@/pages/Home';
import Result from '@/pages/Result';
import History from '@/pages/History';
import HistoryDetail from '@/pages/HistoryDetail';
import Stats from '@/pages/Stats';
import NotFound from '@/pages/NotFound';

/**
 * 앱 셸 — 라우트 6종과 전역 배선(에러 바운더리 · 기록 스토어 · 온보딩)을 이 파일 하나가 소유한다.
 *
 * @AI:NOTE 라우터 자체(BrowserRouter)는 여기 두지 않는다 — main.tsx(@AI:ANCHOR)가 이미
 *   basename과 함께 렌더한다. 여기서 한 번 더 감싸면 라우터가 2개가 되어 주소창과 화면이 어긋난다.
 *
 * @AI:NOTE 중첩 순서에 이유가 있다:
 *   AppErrorBoundary → 라우트 전체를 감싸야 어떤 화면의 렌더 예외도 흰 화면 대신 복구 UI가 된다.
 *   RecordsProvider  → 라우터 위에 있어야 탭 루트가 아닌 /result·/history/:id 에서도
 *                      useRecords()가 동작한다(화면별로 Provider를 두면 저장 직후 목록이 어긋난다).
 *   OnboardingDialog → 화면이 아니라 셸이 1회 마운트한다. 페이지마다 두면 탭을 옮길 때마다 뜬다.
 *
 * @AI:NOTE 탭 루트 3화면(/, /history, /stats)은 각 화면이 이미 자기 하단 탭 도크를
 *   (ScreenScaffold의 bottom 슬롯에) 소유한다 — 여기서 AppLayout으로 한 번 더 감싸면
 *   탭바가 2개로 겹친다. 비-탭 화면(/result, /history/:id)은 탭 없이 하단 CTA만 갖는다.
 */

// 개발 전용 TDS 갤러리 — `import.meta.env.DEV`는 정적 치환(prod=false)이라
// import와 Route가 프로덕션 번들에서 통째로 트리셰이킹된다.
// 확인: `grep -r "TdsGallery" dist/` → 결과 없음.
const DevTdsGallery = import.meta.env.DEV ? lazy(() => import('./pages/__TdsGallery')) : null;

export default function App() {
  return (
    <AppErrorBoundary>
      <RecordsProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/result" element={<Result />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<HistoryDetail />} />
          <Route path="/stats" element={<Stats />} />
          {DevTdsGallery && (
            <Route
              path="/__tds-gallery"
              element={
                <Suspense fallback={null}>
                  <DevTdsGallery />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <OnboardingDialog />
      </RecordsProvider>
    </AppErrorBoundary>
  );
}
