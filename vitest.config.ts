import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  cacheDir: 'node_modules/.vite-vitest',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // 스캐폴드가 남긴 node_modules/.vite 사전 번들 캐시가 react-router-dom을 별도
    // 인스턴스로 로드해, vi.importActual로 얻는 실제 모듈과 Context가 어긋나
    // useLocation/useNavigate가 기본값만 반환하는 문제가 있었다(2026-08-29) — dedupe로
    // 항상 단일 인스턴스를 쓰게 강제해 해결.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Playwright 비주얼 스펙은 e2e/에 있다 — vitest 실행에서 제외(기본 제외 + e2e).
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // 워커 폭발 방지(실사고 2026-07-21 global OOM/exit 137): vitest 기본은 CPU 코어 수만큼
    // 포크를 띄운다(16스레드 머신=최대 16개, 각 수백 MB) → jsdom 로드까지 겹쳐 WSL 총 메모리
    // 소진. 미니앱은 테스트 파일이 3~5개라 2포크로 충분하고 메모리를 8배 이상 줄인다.
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: 2 } },
  },
});
