import { test, expect, devices } from '@playwright/test';
import { esperarSinalAberto, liberarCaminho, lerPosicaoY } from './helpers';

// No celular, ANDAR é segurar a tela (ver onPointerDown na GameArena). Isso
// colide de frente com o toque longo do navegador: como a cena inteira é
// feita de <img>, segurar para andar abria o menu de baixar / compartilhar /
// copiar imagem por cima do jogo. Bastava andar mais de meio segundo.
//
// A defesa tem duas metades, e as duas precisam existir: -webkit-touch-callout
// no CSS (Safari do iOS) e preventDefault no contextmenu (Chrome do Android,
// que ignora a propriedade). Este arquivo existe porque é fácil remover uma
// delas sem perceber, e o estrago só aparece num aparelho de verdade.
test.use({ ...devices['Pixel 7 landscape'] });

test('segurar a tela anda, e o toque longo não abre o menu do navegador', async ({ page }) => {
  await page.goto('/');
  await page.getByText('INICIAR JOGO').tap();
  await page.locator('.scoreboard').waitFor();
  await esperarSinalAberto(page);
  await liberarCaminho(page);

  // Toque real, pelo protocolo do navegador. `page.mouse` e o dispatchEvent
  // sintético não acionam este controle na emulação de celular — o jogador
  // não sai do lugar e o teste passaria uma impressão falsa.
  const cdp = await page.context().newCDPSession(page);
  const caixa = await page.locator('.game-arena').boundingBox();
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;

  // A posição vem do tabuleiro, não do elemento: o boneco fica FIXO na tela e
  // quem anda é a câmera, então o style dele não muda ao caminhar em frente.
  const antes = await lerPosicaoY(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(900);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await lerPosicaoY(page)).not.toBe(antes);

  // O contextmenu é o evento que o Android dispara no toque longo: se ele
  // sair sem defaultPrevented, o menu aparece.
  const prevenido = await page.evaluate(() => {
    const arena = document.querySelector('.game-arena');
    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    (arena.querySelector('img') || arena).dispatchEvent(evento);
    return evento.defaultPrevented;
  });
  expect(prevenido).toBe(true);

  // A metade do iOS. O Chromium não expõe -webkit-touch-callout em
  // getComputedStyle, então a checagem possível aqui é a seleção de texto,
  // que é o que faz subirem as alças azuis junto com o menu.
  const arena = page.locator('.game-arena');
  await expect(arena).toHaveCSS('user-select', 'none');
  await expect(arena).toHaveCSS('touch-action', 'manipulation');
});
