import { test, expect } from '@playwright/test';
import { esperarSinalAberto, esperarSinalFechado, contarVidas, liberarCaminho, andar, lerPosicaoY } from './helpers.js';

// A bicicleta da ciclovia é trânsito de verdade: atropela e custa vida, como
// carro. Este arquivo tranca isso, e de quebra o que a torna diferente — ela
// não para no sinal.
//
// A regra real faz bicicleta ser rara de propósito (1% nas primeiras 20
// ruas), então nenhum teste conseguiria encontrar uma jogando. Por isso o
// interruptor de QA do bicicleta.js: com ele ligado, toda rua elegível vira
// ciclovia. É só a FREQUÊNCIA que muda — a bicicleta em si, o desenho e a
// colisão são exatamente os do jogo normal.
async function iniciarComCiclovia(page) {
  await page.addInitScript(() => {
    localStorage.setItem('travessiaSegura_cicloviaSempre', '1');
  });
  await page.goto('/');
  await page.getByText('INICIAR JOGO').click();
  await page.locator('.scoreboard').waitFor();
  await expect(page.locator('.ciclista').first()).toBeVisible();
}

/**
 * Congela a bicicleta bem na frente do jogador. Mesma ideia do
 * pararVeiculoSobreAFaixa: esperar a bicicleta chegar sozinha deixaria o
 * teste na mão da coincidência entre a volta dela e o ciclo do semáforo.
 */
async function pararBicicletaNoJogador(page) {
  await page.evaluate(() => {
    const arena = document.querySelector('.game-arena');
    const escala = Number(getComputedStyle(arena).zoom) || 1;
    const esquerda = arena.getBoundingClientRect().x;
    const jogador = document.querySelector('.pedestrian').getBoundingClientRect();
    const alvo = (jogador.left + jogador.right) / 2;
    document.querySelectorAll('.ciclista').forEach((el) => {
      const veiculo = el.closest('.vehicle');
      veiculo.style.setProperty('animation', 'none', 'important');
      // O .vehicle nasce em left:-150px; o translate leva o centro dele para
      // o X do jogador.
      const largura = el.getBoundingClientRect().width;
      veiculo.style.transform = `translateX(${(alvo - esquerda - largura / 2) / escala + 150}px)`;
    });
  });
  await page.waitForTimeout(100);
}

test('a bicicleta atropela e custa uma vida', async ({ page }) => {
  await iniciarComCiclovia(page);
  // Tira os CARROS do caminho (o seletor não pega a ciclovia, que fica em
  // outro container): assim quem tirar a vida só pode ter sido a bicicleta.
  await esperarSinalAberto(page);
  await liberarCaminho(page);
  await pararBicicletaNoJogador(page);

  const vidasAntes = await contarVidas(page);

  // Sai do meio-fio e entra na ciclovia. É o erro que o jogo quer ensinar a
  // não cometer: pisar fora da guia sem olhar se vem bicicleta.
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');

  await expect
    .poll(() => contarVidas(page), { timeout: 5_000, message: 'a bicicleta não atropelou' })
    .toBe(vidasAntes - 1);

  // E o atropelamento entrou na conta de infrações, como o de carro.
  await expect(page.locator('.infracoes-board')).not.toHaveText(/\b0\b/);
});

test('quem espera o sinal na guia não é atropelado pela bicicleta', async ({ page }) => {
  // O outro lado da regra acima, e o motivo da folga do meio-fio no
  // Ciclista.jsx: a ciclovia passa rente à guia, e sem essa folga a
  // bicicleta atropelaria justamente quem está fazendo certo — parado,
  // esperando o sinal encostado no meio-fio.
  await iniciarComCiclovia(page);
  await esperarSinalFechado(page);
  await liberarCaminho(page);
  await pararBicicletaNoJogador(page);

  const vidasAntes = await contarVidas(page);

  // Avança até encostar na guia e para. O passo é curto de propósito: com o
  // sinal fechado, INSISTIR na rua custa vida pela regra do sinal, e isso
  // mascararia o que este teste quer ver.
  await andar(page, 'w', 300);
  await page.waitForTimeout(900);

  const y = await lerPosicaoY(page);
  expect(y).toBeGreaterThan(50); // chegou à beira da guia
  expect(y).toBeLessThan(86); // e continua na calçada
  expect(await contarVidas(page)).toBe(vidasAntes);
});

test('a bicicleta não para no sinal fechado', async ({ page }) => {
  await iniciarComCiclovia(page);

  // Com o sinal fechado para o pedestre, os carros andam e a bicicleta
  // também. O que interessa é o outro lado: quando o sinal ABRE, o carro
  // para e a bicicleta continua.
  await esperarSinalAberto(page);

  const posicao = () =>
    page.evaluate(() => {
      const c = document.querySelector('.ciclista');
      const carro = document.querySelector('.car-container[data-lane-index="1"] .car-image');
      return {
        bicicleta: c ? c.getBoundingClientRect().x : null,
        carro: carro ? carro.getBoundingClientRect().x : null,
      };
    });

  const antes = await posicao();
  await page.waitForTimeout(1200);
  const depois = await posicao();

  // O carro daquela rua está parado no vermelho...
  expect(Math.abs(depois.carro - antes.carro)).toBeLessThan(2);
  // ...e a bicicleta andou.
  expect(depois.bicicleta).not.toBe(antes.bicicleta);
});
