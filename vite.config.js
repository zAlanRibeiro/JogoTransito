import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Caminhos RELATIVOS no build (./assets/... em vez de /assets/...).
  //
  // O padrão do Vite é '/', que só funciona se o jogo morar na raiz do
  // domínio. Publicado numa subpasta — nittrans.niteroi.rj.gov.br/jogo/, que
  // é o cenário provável — o index.html pediria /assets/index-xxx.js, a raiz
  // do site responderia com a home da NITTRANS em vez do JavaScript, e o
  // jogador veria uma tela branca sem nenhum erro óbvio.
  //
  // Com './' o mesmo build funciona em qualquer lugar: na raiz, em subpasta
  // de qualquer nome, no GitHub Pages ou aberto direto do disco. Como o jogo
  // é uma página só, sem rotas, não há nada além disto pra ajustar.
  base: './',
  plugins: [react()],
  test: {
    // Só os unitários: os arquivos em e2e/ são do Playwright e casariam com
    // o padrão padrão do Vitest, que tentaria executá-los sem navegador.
    include: ['test/**/*.test.{js,jsx}'],
  },
})
