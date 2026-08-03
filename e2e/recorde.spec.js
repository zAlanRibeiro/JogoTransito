import { test, expect } from '@playwright/test';
import { iniciarPartida, esperarSinalAberto, liberarCaminho, andar, lerPontos } from './helpers.js';

// O recorde mostrado no fim da partida.
//
// Ele já foi um estado atualizado por um efeito que rodava ao chegar em
// 'gameover'/'won'. Passou a ser DERIVADO (o maior entre o recorde guardado e
// a pontuação da partida), e quem fecha a partida — reiniciar ou voltar ao
// menu — é que dobra a pontuação para dentro do valor guardado.
//
// A parte frágil dessa troca é justamente a segunda partida: se a dobra não
// acontecesse, zerar o placar apagaria junto o recorde recém-conquistado.
// Nenhum teste cobria isso, e é o que este arquivo tranca.

/** Joga até perder as três vidas, atravessando na frente de um carro. */
async function perderTodasAsVidas(page) {
  for (let tentativa = 0; tentativa < 12; tentativa++) {
    if (await page.locator('.modal-content').first().isVisible().catch(() => false)) return;
    // Andar para a frente com o sinal fechado custa uma vida por vez.
    await andar(page, 'w', 900);
    await page.waitForTimeout(400);
  }
}

test('o recorde sobrevive ao reinício da partida', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await liberarCaminho(page);

  // Faz alguns pontos atravessando com o caminho livre.
  await andar(page, 'w', 2500);
  await page.waitForTimeout(300);
  const pontosDaPrimeira = await lerPontos(page);
  expect(pontosDaPrimeira).toBeGreaterThan(0);

  await perderTodasAsVidas(page);

  const painel = page.locator('.nit-stat-card--recorde .nit-stat-valor');
  await expect(painel).toBeVisible({ timeout: 15_000 });
  const recordeNaPrimeira = Number(await painel.innerText());
  // O recorde precisa refletir o que a partida alcançou, e não o zero de
  // quem nunca jogou.
  expect(recordeNaPrimeira).toBeGreaterThanOrEqual(pontosDaPrimeira);

  // Segunda partida: perde logo, sem pontuar. O recorde da anterior tem que
  // continuar de pé — é aqui que a versão sem a dobra quebraria, porque o
  // placar zera e o valor derivado voltaria a ser o recorde antigo.
  await page.getByRole('button', { name: /Tentar Novamente/i }).click();
  await page.locator('.scoreboard').waitFor();
  await perderTodasAsVidas(page);

  await expect(painel).toBeVisible({ timeout: 15_000 });
  expect(Number(await painel.innerText())).toBe(recordeNaPrimeira);
});
