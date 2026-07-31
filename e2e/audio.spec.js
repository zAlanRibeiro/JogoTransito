import { test, expect } from '@playwright/test';
import { iniciarPartida, esperarSinalAberto, esperarSinalFechado, andar, liberarCaminho } from './helpers';

// O áudio é todo sintetizado (ver src/features/TravessiaSegura/audio/), então
// não há arquivo pra conferir: o que dá pra verificar é se os nós certos são
// criados nos eventos certos. Grampeamos o AudioContext antes do jogo carregar
// e registramos cada oscilador/ruído disparado.
//
// A checagem funciona mesmo com o contexto suspenso pela política de autoplay
// do navegador: os nós são criados e agendados de qualquer jeito, só não saem
// pelo alto-falante.
async function grampearAudio(page) {
  await page.addInitScript(() => {
    window.__sons = [];
    const Original = window.AudioContext;

    window.AudioContext = class extends Original {
      constructor(...args) {
        super(...args);
        window.__ctx = this;
      }

      createOscillator() {
        const osc = super.createOscillator();
        // A frequência é agendada com setValueAtTime para um instante que
        // pode estar no futuro; nesse caso `frequency.value` ainda não a
        // reflete quando start() é chamado. Por isso anotamos no agendamento.
        const agendadas = [];
        const agendarOriginal = osc.frequency.setValueAtTime.bind(osc.frequency);
        osc.frequency.setValueAtTime = (valor, quando) => {
          agendadas.push(Math.round(valor));
          return agendarOriginal(valor, quando);
        };

        const iniciarOriginal = osc.start.bind(osc);
        osc.start = (...args) => {
          window.__sons.push({ tipo: 'tom', onda: osc.type, freq: agendadas[0] ?? null });
          return iniciarOriginal(...args);
        };
        return osc;
      }

      createBufferSource() {
        const fonte = super.createBufferSource();
        const iniciarOriginal = fonte.start.bind(fonte);
        fonte.start = (...args) => {
          window.__sons.push({ tipo: 'ruido' });
          return iniciarOriginal(...args);
        };
        return fonte;
      }
    };
  });
}

const lerSons = (page) => page.evaluate(() => window.__sons);
// Guardamos o contexto criado pelo jogo pra poder checar se ele saiu do
// estado suspenso — o único jeito de o áudio falhar sem nenhum outro teste
// perceber, já que os nós continuam sendo criados normalmente no mudo do
// navegador.
const lerEstadoDoContexto = (page) => page.evaluate(() => window.__ctx?.state ?? 'inexistente');
const zerarSons = (page) => page.evaluate(() => { window.__sons = []; });

test.beforeEach(async ({ page }) => grampearAudio(page));

test('o clique em INICIAR JOGO libera o áudio bloqueado pela política de autoplay', async ({ page }) => {
  await page.goto('/');
  // Antes de qualquer gesto o contexto nem existe: criá-lo cedo só renderia
  // um contexto suspenso e um aviso no console.
  expect(await lerEstadoDoContexto(page)).toBe('inexistente');

  await page.getByText('INICIAR JOGO').click();
  await page.locator('.scoreboard').waitFor();

  // 'running' é o que separa "o jogo tem som" de "o jogo agenda sons que
  // ninguém ouve". Sem o destravarAudio() dentro do gesto, ficaria em
  // 'suspended' e todos os outros testes deste arquivo continuariam passando.
  await expect.poll(() => lerEstadoDoContexto(page)).toBe('running');
});

test('o sinal sonoro de travessia bipa uma vez por segundo enquanto dá pra atravessar', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await zerarSons(page);

  // O vermelho dura 5s no nível 0; 3,4s deixa margem pra não invadir a
  // virada do sinal, que tocaria outro som e sujaria a contagem.
  await page.waitForTimeout(3400);
  const sons = await lerSons(page);

  // 1000 Hz senoidal é o bip normal; 1250 Hz é o dobrado dos 2 segundos
  // finais. Os dois contam como "o sinal está avisando".
  const bips = sons.filter((s) => s.tipo === 'tom' && s.onda === 'sine' && (s.freq === 1000 || s.freq === 1250));
  expect(bips.length).toBeGreaterThanOrEqual(3);
});

test('a virada do sinal toca sons diferentes ao abrir e ao fechar', async ({ page }) => {
  await iniciarPartida(page);

  await esperarSinalAberto(page);
  await zerarSons(page);
  await esperarSinalFechado(page);
  const aoFechar = await lerSons(page);

  // "Fecha" para o pedestre são duas notas quadradas descendo: 523 e depois
  // 392. A ordem é o que distingue do "abre", que usa as mesmas notas.
  const quadradas = aoFechar.filter((s) => s.tipo === 'tom' && s.onda === 'square').map((s) => s.freq);
  const inicioDaDescida = quadradas.indexOf(523);
  expect(inicioDaDescida).toBeGreaterThanOrEqual(0);
  expect(quadradas[inicioDaDescida + 1]).toBe(392);
});

test('andar toca passos, e parar de andar para os passos', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await liberarCaminho(page);

  await zerarSons(page);
  await andar(page, 'w', 1000);
  const andando = (await lerSons(page)).filter((s) => s.tipo === 'ruido').length;
  // Um passo a cada 300ms, mais o primeiro imediato: ~4 em 1s.
  expect(andando).toBeGreaterThanOrEqual(3);

  await zerarSons(page);
  await page.waitForTimeout(1000);
  const parado = (await lerSons(page)).filter((s) => s.tipo === 'ruido').length;
  expect(parado).toBe(0);
});

test('o botão de som corta todo o áudio e lembra a escolha', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);

  const botao = page.locator('.som-board');
  await expect(botao).toHaveAttribute('aria-label', 'Desativar som do jogo');
  await botao.click();
  await expect(botao).toHaveAttribute('aria-label', 'Ativar som do jogo');

  // No mudo o motor nem chega a criar os nós — economiza CPU e serve de
  // prova de que nada escapa do corte.
  await zerarSons(page);
  await andar(page, 'w', 800);
  await page.waitForTimeout(1200);
  expect(await lerSons(page)).toHaveLength(0);

  // Clicar na arena para andar não pode "destravar" o som de volta.
  await page.reload();
  await page.getByText('INICIAR JOGO').click();
  await expect(page.locator('.som-board')).toHaveAttribute('aria-label', 'Ativar som do jogo');
});

// Os veículos são MUDOS por decisão de projeto: o trânsito passa sem motor,
// sem pneu e sem vento. O que faz barulho na rua é só o que a criança precisa
// escutar — a buzina de quem vai furar o sinal e a batida de quem foi
// atropelado. Um ronco de fundo permanente disputaria com o bip do semáforo,
// que é a peça mais didática do áudio.
//
// As duas cornetas da buzina (440 e 554 Hz) são o único dente-de-serra que
// pode aparecer com o jogador parado na calçada; qualquer outro seria um som
// de veículo tendo voltado.
const CORNETAS_DA_BUZINA = [440, 554];

test('o trânsito passa em silêncio: nenhum veículo tem som próprio', async ({ page }) => {
  await iniciarPartida(page);
  // Sinal fechado para o pedestre é sinal aberto para os carros: é aí que
  // eles andam e cruzam a frente do jogador, que é quando roncariam.
  await esperarSinalFechado(page);
  await zerarSons(page);
  await page.waitForTimeout(3000);

  const serras = (await lerSons(page))
    .filter((s) => s.tipo === 'tom' && s.onda === 'sawtooth')
    .map((s) => s.freq);
  expect(serras.filter((freq) => !CORNETAS_DA_BUZINA.includes(freq))).toEqual([]);
});

test('o botão de som não faz o jogador sair andando', async ({ page }) => {
  await iniciarPartida(page);
  await esperarSinalAberto(page);
  await liberarCaminho(page);

  const antes = await page.locator('.pedestrian').getAttribute('style');
  await page.locator('.som-board').click();
  await page.waitForTimeout(400);
  const depois = await page.locator('.pedestrian').getAttribute('style');
  expect(depois).toBe(antes);
});
