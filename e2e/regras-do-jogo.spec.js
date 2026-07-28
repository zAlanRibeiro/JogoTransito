import { test, expect } from '@playwright/test';
import {
  iniciarPartida,
  esperarSinalAberto,
  esperarSinalFechado,
  lerPosicaoY,
  contarVidas,
  lerPontos,
  contarInfracoes,
  andar,
  liberarCaminho,
  pararVeiculoSobreAFaixa,
} from './helpers.js';

// Regras que só existem com o jogo rodando (colisão, semáforo, guarda e
// respawn dependem do loop de animação e do DOM renderizado). A lógica pura
// de tabuleiro e dificuldade é coberta pelos testes unitários em test/.

test('bater num carro custa exatamente uma vida, não uma cascata', async ({ page }) => {
  // Regressão: sem a janela de invulnerabilidade, segurar W encostado no
  // carro tirava 2 vidas em 1,2s — o jogador voltava e batia de novo no
  // frame seguinte.
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await pararVeiculoSobreAFaixa(page, 1);

  const vidasAntes = await contarVidas(page);
  await andar(page, 'w', 1200);
  await page.waitForTimeout(300);

  expect(await contarVidas(page)).toBe(vidasAntes - 1);
});

test('perder vida devolve o jogador à calçada piscando', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await pararVeiculoSobreAFaixa(page, 1);

  await page.keyboard.down('w');
  await page.waitForTimeout(600);
  await page.keyboard.up('w');

  await expect(page.locator('.pedestrian')).toHaveClass(/respawning/);
  expect(await lerPosicaoY(page)).toBe(0);

  // A animação termina e o controle volta.
  await expect(page.locator('.pedestrian')).not.toHaveClass(/respawning/, { timeout: 3000 });
});

test('entrar na rua com o sinal fechado custa vida e não deixa passar', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalFechado(page);

  const vidasAntes = await contarVidas(page);
  const yAntes = await lerPosicaoY(page);
  await andar(page, 'w', 500);
  await page.waitForTimeout(300);

  expect(await contarVidas(page)).toBe(vidasAntes - 1);
  // Continua na calçada: o movimento é bloqueado, não só punido.
  expect(await lerPosicaoY(page)).toBe(yAntes);
});

test('atravessar fora da faixa vale metade dos pontos', async ({ page }) => {
  // Cada travessia roda numa partida nova: encadear as duas na mesma
  // partida deixava a segunda dependente de onde a primeira parou e do
  // ponto do ciclo do semáforo, o que tornava o resultado instável.
  async function pontosDeUmaTravessia({ desviarDaFaixa }) {
    await iniciarPartida(page);
    await esperarSinalAberto(page);
    // Sem isto, um carro que congelou sobre a faixa atropela o jogador no
    // meio da medição e o resultado vira outra coisa.
    await liberarCaminho(page);
    if (desviarDaFaixa) await andar(page, 'a', 400);
    await andar(page, 'w', 2200);
    await page.waitForTimeout(400);
    // Se um carro tivesse atingido o jogador a comparação não valeria.
    expect(await contarVidas(page)).toBe(3);
    return lerPontos(page);
  }

  const naFaixa = await pontosDeUmaTravessia({ desviarDaFaixa: false });
  expect(naFaixa).toBeGreaterThan(0);

  const foraDaFaixa = await pontosDeUmaTravessia({ desviarDaFaixa: true });
  expect(foraDaFaixa).toBe(Math.round(naFaixa * 0.5));
});

test('desviar de carro que bloqueia a faixa não é punido', async ({ page }) => {
  // O jogador não tem alternativa segura quando um carro para em cima da
  // faixa, então o desvio não pode contar como infração.
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  // Deixa só o carro irregular no caminho: os das outras faixas param em
  // posições aleatórias e atrapalhariam a medição.
  await liberarCaminho(page);
  await pararVeiculoSobreAFaixa(page, 1);
  await expect(page.getByText('Chamar Guarda')).toBeVisible();

  const pontosAntes = await lerPontos(page);
  await andar(page, 'a', 500);
  await andar(page, 'w', 2200);
  await page.waitForTimeout(400);

  expect(await contarVidas(page)).toBe(3);
  expect(await lerPontos(page)).toBeGreaterThan(pontosAntes);
  expect(await contarInfracoes(page)).toBe(0);
});

test('chamar o guarda dá o bônus anunciado no botão e não repete na mesma faixa', async ({ page }) => {
  // Regressão: o rótulo do botão já ficou dizendo "+20" depois que a regra
  // passou a dar 5 pontos.
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await pararVeiculoSobreAFaixa(page, 1);

  const botao = page.getByRole('button', { name: /Chamar Guarda/ });
  await expect(botao).toBeVisible();
  const rotulo = await botao.innerText();
  const bonusAnunciado = Number(rotulo.match(/\+(\d+)/)[1]);

  const antes = await lerPontos(page);
  await page.keyboard.press('e');
  await page.waitForTimeout(400);
  expect(await lerPontos(page)).toBe(antes + bonusAnunciado);

  // Segunda chamada na mesma faixa é ignorada.
  await page.keyboard.press('e');
  await page.waitForTimeout(400);
  expect(await lerPontos(page)).toBe(antes + bonusAnunciado);
});

test('Esc pausa o jogo e congela semáforo e jogador', async ({ page }) => {
  await iniciarPartida(page);
  await page.waitForTimeout(300);

  await page.keyboard.press('Escape');
  await expect(page.getByText('Jogo pausado')).toBeVisible();

  const sinalAoPausar = await page.locator('.signal-badge').innerText();
  const yAoPausar = await lerPosicaoY(page);

  await andar(page, 'w', 1500);
  expect(await page.locator('.signal-badge').innerText()).toBe(sinalAoPausar);
  expect(await lerPosicaoY(page)).toBe(yAoPausar);

  // Esc de novo retoma.
  await page.keyboard.press('Escape');
  await expect(page.getByText('Jogo pausado')).toBeHidden();
});
