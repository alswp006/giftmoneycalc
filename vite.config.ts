/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
    // .ai-factory/qa-pack은 Playwright 시나리오(별도 러너)라 vitest 대상에서 제외한다.
    exclude: ["**/node_modules/**", "**/dist/**", ".ai-factory/**"],
  },
});
