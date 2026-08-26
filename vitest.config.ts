import { defineConfig } from 'vitest/config';
import path from 'path';

// Vite의 내장 "new URL('literal', import.meta.url)" 애셋 변환(vite:asset-import-meta-url)은
// jsdom 테스트 환경을 client consumer로 보고 __tests__ 파일 안에서도 발동한다 — 그 결과
// 실제 file:// 경로 대신 dev-server 절대 URL(http://localhost:3000/...)로 통째로 치환되어
// fs.readFileSync(url)이 "The URL must be of scheme file"로 깨진다. 테스트 파일에서 텍스트
// 파일을 읽으려는 의도(애셋 번들링 의도 아님)이므로 이 플러그인 자체를 리졸브 단계에서 제거한다
// (@vite-ignore 주석 삽입은 environment별 파이프라인 분기 때문에 신뢰성 있게 먹지 않았다).
function disableAssetImportMetaUrlTransform() {
  return {
    name: 'disable-asset-import-meta-url',
    enforce: 'pre' as const,
    configResolved(config: { plugins: Array<{ name: string }> }) {
      const plugins = config.plugins as unknown as Array<{ name: string }>;
      console.log('DEBUG all plugin names:', plugins.map((p) => p.name).join(', '));
      const idx = plugins.findIndex((p) => p.name === 'vite:asset-import-meta-url');
      console.log('DEBUG found idx', idx);
      if (idx !== -1) plugins.splice(idx, 1);
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [disableAssetImportMetaUrlTransform()],
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
