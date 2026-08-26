import type { ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { StorageProvider } from './store/StorageProvider';
import { FloatingTabBar } from './components/FloatingTabBar';
import { TAB_ITEMS, isTabRoute } from './lib/tabs';
import Home from './pages/Home';
import Calc from './pages/Calc';
import Result from './pages/Result';
import RecordNew from './pages/RecordNew';
import History from './pages/History';
import Stats from './pages/Stats';
import Share from './pages/Share';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

/**
 * 탭-루트(홈·기록·통계·설정) 화면 래퍼 — 하단 탭바 + 탭바에 가려지는 만큼의 스페이서.
 *
 * @AI:NOTE 활성 탭은 useLocation이 아니라 Route가 알고 있는 경로(path)로 결정한다.
 * 라우트 정의가 곧 단일 진실이라 "탭바를 띄우는 화면"과 "활성 탭"이 어긋날 수 없고,
 * 계산·결과·기록추가·공유(하단 고정 CTA 화면)에는 애초에 이 래퍼를 씌우지 않는다.
 */
function TabScreen({ path, children }: { path: string; children: ReactNode }) {
  if (!isTabRoute(path)) return <>{children}</>;

  return (
    <>
      {children}
      <div aria-hidden="true" style={{ height: 'calc(64px + var(--toss-safe-area-bottom))' }} />
      <FloatingTabBar items={TAB_ITEMS} activePath={path} />
    </>
  );
}

export default function App() {
  return (
    <StorageProvider>
      <Routes>
        <Route
          path="/"
          element={
            <TabScreen path="/">
              <Home />
            </TabScreen>
          }
        />
        <Route path="/calc" element={<Calc />} />
        <Route path="/result" element={<Result />} />
        <Route path="/record/new" element={<RecordNew />} />
        <Route
          path="/history"
          element={
            <TabScreen path="/history">
              <History />
            </TabScreen>
          }
        />
        <Route
          path="/stats"
          element={
            <TabScreen path="/stats">
              <Stats />
            </TabScreen>
          }
        />
        <Route path="/share" element={<Share />} />
        <Route
          path="/settings"
          element={
            <TabScreen path="/settings">
              <Settings />
            </TabScreen>
          }
        />
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
    </StorageProvider>
  );
}
