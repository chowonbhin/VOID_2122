import { defineConfig, devices } from '@playwright/test';

// Only the golden-path demo test. Start the app first (npm run dev), then: node scripts/verify.mjs
export default defineConfig({
  testDir: 'tests/demo',
  timeout: 60_000,
  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' },
});
