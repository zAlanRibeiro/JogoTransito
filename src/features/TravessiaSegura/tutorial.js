import { BONUS_CHAMAR_GUARDA } from './hooks/useGuardSystem';

// Roteiro do tutorial. Cada passo é uma cena curta, em laço, que mostra uma
// regra do jogo acontecendo, com legendas que mudam junto com a ação.
//
// As cenas são dados em função do tempo (ms desde o início do passo), e não
// animações CSS soltas: semáforo, carros, boneco e legenda saem do mesmo
// relógio e nunca se desencontram. O TutorialModal só lê estes dados num
// instante e desenha.
//
// Coordenadas em unidades do jogo, na mesma escala da arena: calçada, rua,
// rua e calçada de 100 cada, com a faixa no centro. A cena mostra 360 de
// altura e corta o fim da calçada de baixo.
export const LARGURA_DA_CENA = 800;
export const ALTURA_DA_CENA = 360;
export const FAIXA_X = LARGURA_DA_CENA / 2;
export const PISTA = { longe: 150, perto: 250 };

const PE_NA_GUIA = 352; // pés do boneco esperando na calçada de baixo
const PE_DO_OUTRO_LADO = 92; // pés do boneco ao chegar na calçada de cima
const PE_NO_MEIO = 205; // entre as duas ruas
const PARADO_NO_SINAL = 295; // centro do carro parado antes da faixa
const FORA_ESQ = -70;
const FORA_DIR = LARGURA_DA_CENA + 70;
const FORA_DA_FAIXA = 170;

// Valores do jogo, para a legenda nunca prometer outro número.
const PONTOS_DA_TRAVESSIA = 6; // 300 de subida a cada 50 por ponto (GameArena)
const MULTA_DO_SINAL = 10;

// Valor de uma lista [[ate, valor], ...] no instante t: o primeiro trecho
// que ainda não acabou. Serve para legendas, sinal e vidas.
export function noTrecho(trechos, t) {
  return (trechos.find(([ate]) => t < ate) ?? trechos[trechos.length - 1])[1];
}

// Posição numa trajetória [[t, ...valores], ...], interpolada em linha reta.
// Antes do primeiro ponto e depois do último fica parada nas pontas; dois
// pontos com o mesmo t são um corte (o boneco reaparece na guia).
export function naTrajetoria(pontos, t) {
  const i = pontos.findIndex(([tp]) => tp > t);
  if (i === -1) return { valores: pontos[pontos.length - 1].slice(1), andando: false };
  if (i === 0) return { valores: pontos[0].slice(1), andando: false };
  const [t0, ...a] = pontos[i - 1];
  const [t1, ...b] = pontos[i];
  const k = (t - t0) / (t1 - t0);
  return { valores: a.map((v, j) => v + (b[j] - v) * k), andando: a.some((v, j) => v !== b[j]) };
}

const atravessa = (inicio, fim, x = FAIXA_X) => [[inicio, x, PE_NA_GUIA], [fim, x, PE_DO_OUTRO_LADO]];
// Fica do outro lado até `t` e reaparece na guia, em `x`, para a próxima demonstração.
const volta = (t, xAntes, x = FAIXA_X) => [[t, xAntes, PE_DO_OUTRO_LADO], [t, x, PE_NA_GUIA]];
const paradoNoSinal = (cor, pista) => ({ cor, y: PISTA[pista], pontos: [[0, PARADO_NO_SINAL]] });

export const PASSOS = [
  {
    titulo: 'Seu objetivo',
    duracao: 7000,
    sinal: [[7000, 'red']],
    legendas: [
      [3500, 'Atravesse as ruas de Niterói até chegar à praia, aos 200 pontos.'],
      [7000, 'Ande com W ou ↑. No celular, use o joystick no canto da tela.'],
    ],
    veiculos: [paradoNoSinal('azul', 'longe'), paradoNoSinal('branco', 'perto')],
    boneco: { pontos: atravessa(800, 4800) },
    pontos: [{ de: 4800, ate: 6600, texto: `+${PONTOS_DA_TRAVESSIA}`, x: FAIXA_X }],
  },
  {
    titulo: 'Espere o sinal',
    duracao: 10500,
    sinal: [[4000, 'green'], [5500, 'yellow'], [10500, 'red']],
    legendas: [
      [4000, 'Este semáforo é o dos carros. No verde eles passam: espere na calçada.'],
      [5500, 'No amarelo os carros ainda passam. Continue esperando.'],
      [10500, 'No vermelho os carros param e o aviso diz "Atravesse". Agora pode ir!'],
    ],
    veiculos: [
      { cor: 'verde', y: PISTA.longe, pontos: [[0, FORA_ESQ], [3000, FORA_DIR]] },
      { cor: 'vinho', y: PISTA.perto, pontos: [[1200, FORA_ESQ], [4200, FORA_DIR]] },
      { cor: 'azul', y: PISTA.longe, pontos: [[3600, FORA_ESQ], [5600, PARADO_NO_SINAL]] },
      { cor: 'branco', y: PISTA.perto, pontos: [[4300, FORA_ESQ], [6000, PARADO_NO_SINAL]] },
    ],
    boneco: { pontos: atravessa(6400, 9600) },
  },
  {
    titulo: 'Termine a travessia',
    duracao: 10500,
    sinal: [[7000, 'red'], [8000, 'yellow'], [10500, 'green']],
    legendas: [
      [4600, 'Os pontos só contam quando você chega na outra calçada.'],
      [10500, `Não pare no meio da rua: se o sinal abrir com você nela, perde ${MULTA_DO_SINAL} pontos.`],
    ],
    veiculos: [paradoNoSinal('vinho', 'longe'), paradoNoSinal('verde', 'perto')],
    boneco: {
      pontos: [...atravessa(300, 3300), ...volta(4600, FAIXA_X), [5000, FAIXA_X, PE_NA_GUIA], [6200, FAIXA_X, PE_NO_MEIO]],
    },
    pontos: [{ de: 3300, ate: 4600, texto: `+${PONTOS_DA_TRAVESSIA}`, x: FAIXA_X }],
    // Janela do tamanho da animação do .feedback-banner (2,2s no leve, 2,8s no
    // grave): passando disso, ele volta a aparecer depois de sumir.
    avisos: [{ de: 8000, ate: 10200, texto: `O sinal abriu com você na rua! -${MULTA_DO_SINAL} pontos.`, gravidade: 'leve' }],
  },
  {
    titulo: 'Use a faixa',
    duracao: 9500,
    sinal: [[9500, 'red']],
    legendas: [
      [4800, 'Fora da faixa de pedestres, a travessia vale só metade dos pontos.'],
      [9500, 'Pela faixa você ganha a travessia inteira.'],
    ],
    veiculos: [paradoNoSinal('branco', 'longe'), paradoNoSinal('azul', 'perto')],
    boneco: { pontos: [...atravessa(300, 3300, FORA_DA_FAIXA), ...volta(4800, FORA_DA_FAIXA), ...atravessa(5200, 8200)] },
    pontos: [
      { de: 3300, ate: 4800, texto: `+${PONTOS_DA_TRAVESSIA / 2}`, x: FORA_DA_FAIXA },
      { de: 8200, ate: 9500, texto: `+${PONTOS_DA_TRAVESSIA}`, x: FAIXA_X },
    ],
    avisos: [{ de: 3300, ate: 4800, texto: 'Fora da faixa de pedestres! Pontos pela metade.', gravidade: 'leve' }],
  },
  {
    titulo: 'Carro que fura o sinal',
    duracao: 10000,
    sinal: [[10000, 'red']],
    legendas: [
      [4400, 'Às vezes um carro fura o sinal vermelho. Ele buzina antes de passar.'],
      [10000, 'Por isso, mesmo com o sinal a seu favor, olhe para os lados antes de pisar na rua.'],
    ],
    veiculos: [
      paradoNoSinal('verde', 'longe'),
      { cor: 'vinho', y: PISTA.perto, pontos: [[800, FORA_ESQ], [4200, FORA_DIR]], buzina: [800, 2600] },
    ],
    boneco: { pontos: atravessa(4800, 7800) },
    pontos: [{ de: 7800, ate: 9300, texto: `+${PONTOS_DA_TRAVESSIA}`, x: FAIXA_X }],
  },
  {
    titulo: 'Olhe a ciclovia',
    duracao: 10500,
    sinal: [[10500, 'red']],
    ciclovia: true,
    legendas: [
      [4800, 'A faixa vermelha é a ciclovia. A bicicleta não para no sinal!'],
      [10500, 'Espere a bicicleta passar e só então atravesse.'],
    ],
    veiculos: [paradoNoSinal('azul', 'longe'), { ...paradoNoSinal('branco', 'perto'), y: PISTA.perto - 12 }],
    // A bicicleta corre rente à calçada, na faixa vermelha da beirada da rua.
    bicicleta: { y: 282, pontos: [[500, FORA_ESQ], [5000, FORA_DIR]] },
    boneco: { pontos: atravessa(5000, 8000) },
    pontos: [{ de: 8000, ate: 9500, texto: `+${PONTOS_DA_TRAVESSIA}`, x: FAIXA_X }],
  },
  {
    titulo: 'Chame o guarda',
    duracao: 11500,
    sinal: [[11500, 'red']],
    legendas: [
      [2800, 'Carro parado em cima da faixa? Aperte E ou o botão "Chamar Guarda".'],
      [6800, 'O guarda vem e multa o motorista...'],
      [11500, `...e a faixa fica livre. Você ganha ${BONUS_CHAMAR_GUARDA} pontos de bônus.`],
    ],
    veiculos: [
      paradoNoSinal('verde', 'longe'),
      { cor: 'vinho', y: PISTA.perto, pontos: [[0, FAIXA_X], [6800, FAIXA_X], [8600, FORA_DIR]] },
    ],
    botaoGuarda: [0, 2800],
    // Pela esquerda: à direita da faixa fica o poste do semáforo.
    guarda: {
      pe: 318,
      pontos: [[2800, FORA_ESQ], [4800, FAIXA_X - 100], [6800, FAIXA_X - 100], [8800, FORA_ESQ]],
      multando: [4800, 6800],
    },
    boneco: { pontos: atravessa(8800, 11400) },
    pontos: [{ de: 6800, ate: 8400, texto: `+${BONUS_CHAMAR_GUARDA}`, x: FAIXA_X - 100 }],
  },
  {
    titulo: 'Cuide das suas vidas',
    duracao: 9000,
    sinal: [[9000, 'green']],
    legendas: [
      [4500, 'Você tem 3 vidas. Entrar na rua com os carros passando custa uma.'],
      [9000, 'Ser atingido também custa. Sem vidas, a partida acaba.'],
    ],
    veiculos: [
      { cor: 'azul', y: PISTA.longe, pontos: [[0, FORA_ESQ], [3000, FORA_DIR]] },
      { cor: 'branco', y: PISTA.perto, pontos: [[600, FORA_ESQ], [3600, FORA_DIR]] },
      { cor: 'verde', y: PISTA.longe, pontos: [[4000, FORA_ESQ], [7000, FORA_DIR]] },
      { cor: 'vinho', y: PISTA.perto, pontos: [[5200, FORA_ESQ], [8200, FORA_DIR]] },
    ],
    // O jogo barra o passo para dentro da rua e cobra a vida ali mesmo.
    boneco: { pontos: [[1200, FAIXA_X, PE_NA_GUIA], [1600, FAIXA_X, PE_NA_GUIA - 14], [1601, FAIXA_X, PE_NA_GUIA]], piscando: [1600, 3000] },
    vidas: [[1600, 3], [9000, 2]],
    avisos: [{ de: 1600, ate: 4400, texto: 'Cuidado! Os carros ainda estão passando!', gravidade: 'grave' }],
  },
];
