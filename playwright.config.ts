import { defineConfig, devices } from '@playwright/test';

// Pruebas end-to-end sobre la versión web de la app (la que se despliega en Vercel).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8081',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Genera la versión web estática (la misma que se despliega en Vercel) y la sirve en
  // 127.0.0.1:8081 antes de las pruebas. En GitHub Actions el servidor de desarrollo de
  // Expo no respondía al navegador; la build estática es además más fiel a producción.
  webServer: {
    command: 'npx expo export --platform web && npx serve dist --single --no-clipboard --listen tcp://127.0.0.1:8081',
    url: 'http://127.0.0.1:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { CI: '1' },
  },
});
