import { test, expect, devices } from '@playwright/test';
import { esperarSinalAberto, liberarCaminho, lerPosicaoY } from './helpers';

// O controle de celular é um joystick virtual no canto inferior esquerdo.
// Ele substituiu um esquema de zonas invisíveis em que segurar a tela andava
// para a frente e os cantos de baixo andavam para os lados.
//
// Este arquivo cobre as três coisas que aquele esquema não dava conta e que
// só aparecem num aparelho de verdade.
test.use({ ...devices['Pixel 7 landscape'] });

/** Arrasta a alavanca a partir do centro do berço e segura. */
async function empurrarJoystick(page, cdp, dx, dy, ms = 700) {
  const berco = await page.locator('.joystick').boundingBox();
  const x = berco.x + berco.width / 2;
  const y = berco.y + berco.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
}

const lerX = (page) =>
  page.evaluate(() => {
    const a = document.querySelector('.game-arena').getBoundingClientRect();
    const p = document.querySelector('.pedestrian').getBoundingClientRect();
    return p.left + p.width / 2 - a.left;
  });

async function comecarPartida(page) {
  await page.goto('/');
  await page.getByText('INICIAR JOGO').tap();
  await page.locator('.scoreboard').waitFor();
  await esperarSinalAberto(page);
  await liberarCaminho(page);
  return page.context().newCDPSession(page);
}

test('o joystick anda nas quatro direções, inclusive para trás', async ({ page }) => {
  const cdp = await comecarPartida(page);

  // Frente. A posição vem do TABULEIRO: o boneco fica fixo na tela e quem
  // anda é a câmera, então o style dele não muda ao caminhar em frente.
  const yInicial = await lerPosicaoY(page);
  await empurrarJoystick(page, cdp, 0, -40);
  const yDepoisDeAndar = await lerPosicaoY(page);
  expect(yDepoisDeAndar).toBeGreaterThan(yInicial);

  // Trás — a direção que o toque não tinha antes do joystick.
  await empurrarJoystick(page, cdp, 0, 40);
  expect(await lerPosicaoY(page)).toBeLessThan(yDepoisDeAndar);

  // Lados.
  const xInicial = await lerX(page);
  await empurrarJoystick(page, cdp, -40, 0);
  const xAposEsquerda = await lerX(page);
  expect(xAposEsquerda).toBeLessThan(xInicial);

  await empurrarJoystick(page, cdp, 40, 0);
  expect(await lerX(page)).toBeGreaterThan(xAposEsquerda);
});

test('encostar no centro do joystick não move o boneco', async ({ page }) => {
  const cdp = await comecarPartida(page);
  const x0 = await lerX(page);
  const y0 = await lerPosicaoY(page);

  // Zona morta: sem ela, só encostar o polegar já empurraria o jogador, e ele
  // nunca conseguiria ficar parado na calçada esperando o sinal.
  await empurrarJoystick(page, cdp, 3, 3, 600);

  expect(await lerX(page)).toBeCloseTo(x0, 0);
  expect(await lerPosicaoY(page)).toBe(y0);
});

test('tocar a tela fora do joystick não anda mais', async ({ page }) => {
  const cdp = await comecarPartida(page);
  const y0 = await lerPosicaoY(page);
  const arena = await page.locator('.game-arena').boundingBox();

  // Segurar a tela era o controle antigo. Se ainda andasse, os dois esquemas
  // estariam convivendo e o jogador andaria sem querer ao tocar em qualquer
  // lugar da cena.
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: arena.x + arena.width * 0.6, y: arena.y + arena.height * 0.5 }],
  });
  await page.waitForTimeout(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  expect(await lerPosicaoY(page)).toBe(y0);
});

test('o toque longo não abre o menu do navegador', async ({ page }) => {
  await comecarPartida(page);

  // Continua valendo com o joystick: a cena é toda feita de <img>, e sem esta
  // defesa o toque longo abre o menu de baixar / compartilhar imagem por cima
  // do jogo. -webkit-touch-callout resolve no iOS; o Chrome do Android só
  // para com o preventDefault no contextmenu.
  const prevenido = await page.evaluate(() => {
    const arena = document.querySelector('.game-arena');
    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    (arena.querySelector('img') || arena).dispatchEvent(evento);
    return evento.defaultPrevented;
  });
  expect(prevenido).toBe(true);
  await expect(page.locator('.game-arena')).toHaveCSS('user-select', 'none');
});
