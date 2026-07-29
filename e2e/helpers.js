// Utilidades compartilhadas pelos testes de ponta a ponta.
//
// A arena tem coordenadas internas fixas de 600x400 e é escalada por CSS;
// por isso tudo aqui converte medidas de tela de volta para essas unidades.

// BASE_TOP do GameArena: ARENA_HEIGHT(400) - PLAYER_SCREEN_BOTTOM(60) - SEGMENT_HEIGHT/2(50)
const BASE_TOP = 290;

export async function iniciarPartida(page) {
  await page.goto('/');
  await page.getByText('INICIAR JOGO').click();
  await page.locator('.scoreboard').waitFor();
}

// Os dois esperam pelo .signal-badge, e não pelo texto solto: a região viva
// que anuncia o sinal para leitores de tela também contém "Espere", e um
// seletor por texto casaria com os dois elementos.

/** Espera o sinal abrir para o pedestre (rótulo "Atravesse"). */
export async function esperarSinalAberto(page) {
  await page.locator('.signal-badge', { hasText: 'Atravesse' }).waitFor({ timeout: 20_000 });
}

/** Espera o sinal fechado para o pedestre (rótulo "Espere"). */
export async function esperarSinalFechado(page) {
  await page.locator('.signal-badge', { hasText: 'Espere' }).waitFor({ timeout: 20_000 });
}

/**
 * Posição Y do jogador no tabuleiro. Ele fica fixo na tela (a câmera é que
 * anda), então lemos a partir do translateY de uma faixa de índice conhecido.
 */
export async function lerPosicaoY(page) {
  return page.evaluate((baseTop) => {
    const el = document.querySelector('.car-container[data-lane-index]');
    if (!el) return null;
    const indice = Number(el.getAttribute('data-lane-index'));
    const m = el.style.transform.match(/translateY\(([-\d.]+)px\)/);
    return m ? parseFloat(m[1]) - baseTop + indice * 100 : null;
  }, BASE_TOP);
}

export function contarVidas(page) {
  return page.locator('.lives-board svg[fill="#e74c3c"]').count();
}

export async function lerPontos(page) {
  const texto = await page.locator('.scoreboard').innerText();
  return Number(texto.replace(/\D/g, ''));
}

export async function contarInfracoes(page) {
  const texto = await page.locator('.infracoes-board').innerText();
  return Number(texto.replace(/\D/g, ''));
}

export async function andar(page, tecla, ms) {
  await page.keyboard.down(tecla);
  await page.waitForTimeout(ms);
  await page.keyboard.up(tecla);
}

/**
 * Congela todos os veículos longe do corredor central, deixando a travessia
 * livre. Quando o sinal fecha, cada carro para onde estiver — e às vezes é
 * bem em cima da faixa. Para testes que medem pontuação isso vira ruído:
 * o jogador esbarra num carro parado e a partida toma outro rumo.
 */
export async function liberarCaminho(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.car-container .vehicle').forEach((veiculo) => {
      veiculo.style.setProperty('animation', 'none', 'important');
      // Bem à esquerda do corredor por onde o jogador anda.
      veiculo.style.transform = 'translateX(-400px)';
    });
  });
  await page.waitForTimeout(100);
}

/**
 * Anda para o lado até o jogador sair da largura do veículo parado na faixa.
 * A distância não pode ser fixa: o tipo do veículo é sorteado, e um ônibus
 * ocupa mais que o dobro de um carro.
 */
export async function desviarDoVeiculo(page, faixa) {
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const livre = await page.evaluate((f) => {
      const img = document.querySelector(`.car-container[data-lane-index="${f}"] .car-image`);
      const jogador = document.querySelector('.pedestrian');
      if (!img || !jogador) return false;
      const v = img.getBoundingClientRect();
      const p = jogador.getBoundingClientRect();
      return p.right < v.left - 6 || p.left > v.right + 6;
    }, faixa);
    if (livre) return true;
    await andar(page, 'a', 100);
  }
  return false;
}

/**
 * Congela o veículo de uma faixa exatamente em cima da faixa de pedestres,
 * simulando o carro que parou irregularmente sobre ela.
 */
export async function pararVeiculoSobreAFaixa(page, faixa) {
  await page.evaluate((indice) => {
    const container = document.querySelector(`.car-container[data-lane-index="${indice}"]`);
    if (!container) throw new Error(`faixa ${indice} não está renderizada`);
    const veiculo = container.querySelector('.vehicle');
    const arena = document.querySelector('.game-arena').getBoundingClientRect();
    const escala = arena.width / 600;
    const centroDaArena = arena.left + arena.width / 2;
    veiculo.style.setProperty('animation', 'none', 'important');
    // Zera qualquer deslocamento anterior antes de medir: o transform final
    // é absoluto (parte da posição natural), então medir já deslocado daria
    // um resultado acumulado e o carro cairia fora da faixa.
    veiculo.style.transform = 'none';
    const r = veiculo.getBoundingClientRect();
    const deslocamento = (centroDaArena - (r.left + r.right) / 2) / escala;
    veiculo.style.transform = `translateX(${deslocamento}px)`;
  }, faixa);
  // O radar do guarda varre a cada 300ms.
  await page.waitForTimeout(600);
}
