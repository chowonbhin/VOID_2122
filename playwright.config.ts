import { defineConfig, devices } from '@playwright/test';

// Only the golden-path demo test. Start the app first (npm run dev), then: node scripts/verify.mjs [--mobile]
const device = process.env.DEMO_MOBILE ? devices['Pixel 7'] : { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } };

export default defineConfig({
  testDir: 'tests/demo',
  timeout: 60_000,
  use: { ...device, locale: 'ko-KR', timezoneId: 'Asia/Seoul' },
});
