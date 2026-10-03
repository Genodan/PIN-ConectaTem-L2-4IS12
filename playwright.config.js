// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Pruebas end-to-end sobre la versión web de la app (la que se despliega en Vercel).
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Arranca el servidor web de Expo antes de las pruebas (o reutiliza el que ya esté abierto).
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { CI: '1' },
  },
});
