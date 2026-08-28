import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Home from './pages/Home';
import Calc from './pages/Calc';
import Result from './pages/Result';
import History from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import Stats from './pages/Stats';
import Share from './pages/Share';
import Settings from './pages/Settings';
import { useCloseOverlaysOnRouteChange } from './hooks/useOverlayLifecycle';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

/**
 * 라우팅 단독 소유 파일. 화면을 추가하면 여기에 Route를 함께 등록해야 한다 —
 * 등록하지 않은 경로로 navigate하면 catch-all이 홈으로 되돌려 보낸다.
 *
 * 하단 탭바(FloatingTabBar)는 탭-루트 4화면이 각자 ScreenScaffold의 bottom 슬롯에
 * 렌더하고, 목록은 src/lib/nav.ts의 NAV_TABS 하나만 쓴다.
 */
export default function App() {
  // 라우트 이동·하드웨어 뒤로가기 시 열린 오버레이를 모두 닫고 body 스크롤 잠금을 푼다.
  useCloseOverlaysOnRouteChange();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/calc" element={<Calc />} />
      <Route path="/result" element={<Result />} />
      <Route path="/history" element={<History />} />
      <Route path="/history/:id" element={<HistoryDetail />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/share" element={<Share />} />
      <Route path="/settings" element={<Settings />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
