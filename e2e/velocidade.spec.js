import { test, expect } from '@playwright/test';
import { esperarSinalAberto, liberarCaminho, lerPosicaoY } from './helpers';

// A velocidade do jogador precisa ser a mesma em qualquer tela.
//
// Ela já foi "4px por quadro" de requestAnimationFrame, que dispara na taxa
// de atualização do monitor. Num desktop de 60Hz isso dava os 240px/s para
// os quais o jogo foi calibrado; num celular de 120Hz dava 480px/s, e o
// boneco corria o dobro do previsto enquanto os carros (animação CSS) e o
// semáforo (setTimeout) seguiam no relógio.
//
// O defeito é INVISÍVEL numa máquina de desenvolvimento de 60Hz: passava em
// todos os testes e só aparecia na mão de quem jogava no celular. Por isso
// este arquivo força uma taxa alta em vez de confiar na tela real.
const VELOCIDADE_ESPERADA = 240; // px da arena por segundo

/** Troca o requestAnimationFrame por um temporizador rápido, simulando uma
 *  tela de alta taxa. As animações CSS dos carros não passam por aqui — são
 *  tocadas pelo compositor —, então isto isola só o laço do jogador. */
async function simularTelaRapida(page) {
  await page.addInitScript(() => {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 4);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  });
}

async function medirVelocidade(page) {
  await page.goto('/');
  await page.getByText('INICIAR JOGO').click();
  await page.locator('.scoreboard').waitFor();
  await esperarSinalAberto(page);
  await liberarCaminho(page);

  const antes = await lerPosicaoY(page);
  const inicio = Date.now();
  await page.keyboard.down('w');
  await page.waitForTimeout(1000);
  await page.keyboard.up('w');
  const segundos = (Date.now() - inicio) / 1000;
  return ((await lerPosicaoY(page)) - antes) / segundos;
}

test('o jogador anda na mesma velocidade numa tela de alta taxa', async ({ page }) => {
  await simularTelaRapida(page);
  const velocidade = await medirVelocidade(page);
  console.log(`velocidade com tela rápida: ${velocidade.toFixed(0)} px/s`);
  // Margem larga: o teclado leva alguns milissegundos para ser registrado e
  // a medida é cronometrada de fora do navegador. O que este teste pega é a
  // volta do erro antigo, que multiplicava a velocidade por 2 ou mais.
  expect(velocidade).toBeGreaterThan(VELOCIDADE_ESPERADA * 0.75);
  expect(velocidade).toBeLessThan(VELOCIDADE_ESPERADA * 1.25);
});

test('o jogador anda na mesma velocidade na taxa normal da tela', async ({ page }) => {
  const velocidade = await medirVelocidade(page);
  console.log(`velocidade com tela normal: ${velocidade.toFixed(0)} px/s`);
  expect(velocidade).toBeGreaterThan(VELOCIDADE_ESPERADA * 0.75);
  expect(velocidade).toBeLessThan(VELOCIDADE_ESPERADA * 1.25);
});
