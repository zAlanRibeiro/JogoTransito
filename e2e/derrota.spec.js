import { test, expect } from '@playwright/test';
import {
  iniciarPartida,
  esperarSinalAberto,
  lerPosicaoY,
  contarVidas,
  andar,
  pararVeiculoSobreAFaixa,
} from './helpers.js';

// A cutscene que fecha a partida: o jogo congela onde a última vida acabou,
// o boneco pisca ali, as nuvens tomam a tela e a cena vira o céu, com o
// fantasma subindo. Só então entra o painel de fim de jogo.
//
// O que este arquivo tranca é a parte que dá pra quebrar sem perceber: a
// última vida é a ÚNICA que não devolve o jogador à calçada. Todas as outras
// devolvem (regras-do-jogo.spec.js cobre isso), e o respawn era chamado sem
// distinção — com ele de volta, a cena começaria com o boneco teleportado
// para a calçada, e não no lugar do acidente.

/** Bate no carro parado sobre a faixa até a cutscene começar. */
async function perderTodasAsVidasNaFaixa(page) {
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    if (await page.locator('.cena-derrota').count()) return;
    // Sempre com o sinal aberto: assim quem tira a vida é sempre o carro, e
    // a morte acontece no meio da rua — que é onde a cena precisa parar.
    await esperarSinalAberto(page);
    await andar(page, 'w', 1200);
    // Espera a janela de invulnerabilidade do respawn passar.
    await page.waitForTimeout(1800);
  }
}

test('a última vida para a cena onde o jogador morreu e leva ao céu', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await pararVeiculoSobreAFaixa(page, 1);

  await perderTodasAsVidasNaFaixa(page);

  expect(await contarVidas(page)).toBe(0);
  await expect(page.locator('.cena-derrota')).toBeVisible();

  const yDaMorte = await lerPosicaoY(page);
  // Morreu no asfalto (o carro estava parado sobre a faixa), não na calçada.
  expect(yDaMorte).toBeGreaterThan(0);

  // O boneco pisca no lugar, e não volta piscando para a calçada.
  await expect(page.locator('.pedestrian')).toHaveClass(/morrendo/);
  await expect(page.locator('.pedestrian')).not.toHaveClass(/respawning/);

  // O trânsito para junto: a animação dos carros fica congelada, sem
  // continuar correndo por baixo das nuvens.
  const estadoDaAnimacao = await page
    .locator('.car-container[data-lane-index="2"] .vehicle')
    .first()
    .evaluate((el) => getComputedStyle(el).animationPlayState);
  expect(estadoDaAnimacao).toBe('paused');

  // Um segundo depois a cena continua exatamente onde parou.
  await page.waitForTimeout(1000);
  expect(await lerPosicaoY(page)).toBe(yDaMorte);
  // E o painel de fim de jogo ainda não chegou: a cutscene vem antes.
  expect(await page.locator('.modal-content').count()).toBe(0);

  // O painel entra no fim da cutscene, com o céu de fundo.
  await expect(page.getByRole('heading', { name: 'Fim de Jogo!' })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.cena-derrota-ceu')).toBeVisible();

  // Reiniciar volta para o jogo, sem sobra da cena de derrota.
  await page.getByRole('button', { name: /Tentar Novamente/i }).click();
  await expect(page.locator('.cena-derrota')).toHaveCount(0);
  expect(await contarVidas(page)).toBe(3);
  expect(await lerPosicaoY(page)).toBe(0);
});

test('do fim de jogo dá para voltar ao menu principal', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await pararVeiculoSobreAFaixa(page, 1);
  await perderTodasAsVidasNaFaixa(page);
  await expect(page.getByRole('heading', { name: 'Fim de Jogo!' })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /Voltar ao menu/i }).click();
  await expect(page.getByText('INICIAR JOGO')).toBeVisible();
  await expect(page.locator('.cena-derrota')).toHaveCount(0);

  // A partida seguinte começa do zero, como pelo "Tentar Novamente".
  await page.getByText('INICIAR JOGO').click();
  expect(await contarVidas(page)).toBe(3);
  expect(await lerPosicaoY(page)).toBe(0);
});
