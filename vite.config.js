import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Só os unitários: os arquivos em e2e/ são do Playwright e casariam com
    // o padrão padrão do Vitest, que tentaria executá-los sem navegador.
    include: ['test/**/*.test.{js,jsx}'],
  },
})
