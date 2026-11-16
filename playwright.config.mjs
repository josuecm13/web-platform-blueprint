import { defineConfig } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: executablePath ? {
      executablePath,
      args: process.env.PLAYWRIGHT_CHROMIUM_ARGS?.split(' ') ?? [],
    } : {},
  },
  webServer: {
    env: { BLUEPRINT_DB_PATH: ':memory:' },
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/components/',
  },
});
