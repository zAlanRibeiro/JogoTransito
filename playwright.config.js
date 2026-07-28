import { defineConfig, devices } from '@playwright/test';

const PORTA = 5199;

export default defineConfig({
  testDir: './e2e',
  // As regras testadas dependem do ciclo do semáforo (segundos reais), então
  // um teste sozinho pode levar dezenas de segundos.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Em série: os testes competem por tempo de CPU e o jogo roda em
  // requestAnimationFrame — paralelizar deixa o resultado instável.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    viewport: { width: 1000, height: 700 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
