import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5174', headless: true },
  webServer: {
    command: 'node scripts/run-vite-demo-test.mjs',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
  },
  reporter: 'list',
})
