import { tocarTom, tocarRuido } from './motorDeAudio';

// Receitas de cada som do jogo. Se um dia entrar áudio gravado, é AQUI que
// se troca: o resto do jogo só chama `tocar('nome')` e não sabe se por trás
// existe um oscilador ou um arquivo.
//
// Regra geral de mixagem: o que informa (sinal, apito, buzina) fala mais
// alto que o que só acompanha (passo, clique). Um jogo em que o passo
// compete com o sinal sonoro ensina a ignorar o sinal.

// Notas usadas nas melodias, em Hz.
const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

// O passo alterna entre duas cores de filtro (pé esquerdo / pé direito).
// Dois passos idênticos em sequência soam mecânicos.
let peDireito = false;

const SONS = {
  // --- Sinal sonoro de travessia ---------------------------------------
  // O bip dos semáforos acessíveis de verdade, que existe para quem não
  // enxerga a cor do sinal. Num jogo sobre travessia segura ele não é
  // enfeite: a criança aprende que aquele som significa "agora dá pra
  // atravessar" e passa a reconhecê-lo na rua.
  bipTravessia() {
    tocarTom({ freq: 1000, tipo: 'sine', duracao: 0.09, volume: 0.5 });
  },

  // Mesma ideia, mas nos últimos segundos: dois bips mais agudos e juntos,
  // como os semáforos que aceleram a cadência quando o tempo acaba.
  bipUrgente() {
    tocarTom({ freq: 1250, tipo: 'sine', duracao: 0.07, volume: 0.55 });
    tocarTom({ freq: 1250, tipo: 'sine', atraso: 0.13, duracao: 0.07, volume: 0.55 });
  },

  // --- Mudanças de sinal -----------------------------------------------
  // Abriu para o pedestre (vermelho para os carros): duas notas subindo.
  sinalAbre() {
    tocarTom({ freq: G4, tipo: 'square', duracao: 0.11, volume: 0.4 });
    tocarTom({ freq: C5, tipo: 'square', atraso: 0.1, duracao: 0.16, volume: 0.4 });
  },

  // Amarelo: uma nota só, tensa, sem resolver.
  sinalAtencao() {
    tocarTom({ freq: 660, tipo: 'square', duracao: 0.22, volume: 0.35 });
  },

  // Fechou para o pedestre: as mesmas notas do "abre", ao contrário.
  sinalFecha() {
    tocarTom({ freq: C5, tipo: 'square', duracao: 0.11, volume: 0.4 });
    tocarTom({ freq: G4, tipo: 'square', atraso: 0.1, duracao: 0.18, volume: 0.4 });
  },

  // --- Jogador ----------------------------------------------------------
  passo() {
    peDireito = !peDireito;
    tocarRuido({
      duracao: 0.05,
      volume: 0.16,
      filtro: 'lowpass',
      freqFiltro: peDireito ? 820 : 620,
      ataque: 0.002,
    });
  },

  // Travessia concluída, pontos creditados: arpejo curto subindo.
  pontos() {
    tocarTom({ freq: C5, tipo: 'square', duracao: 0.07, volume: 0.3 });
    tocarTom({ freq: E5, tipo: 'square', atraso: 0.07, duracao: 0.07, volume: 0.3 });
    tocarTom({ freq: G5, tipo: 'square', atraso: 0.14, duracao: 0.14, volume: 0.3 });
  },

  // Infração leve (fora da faixa, sinal abriu com você na rua): duas notas
  // descendo, ríspidas mas sem o peso da batida.
  avisoLeve() {
    tocarTom({ freq: 330, tipo: 'sawtooth', duracao: 0.1, volume: 0.28 });
    tocarTom({ freq: 247, tipo: 'sawtooth', atraso: 0.09, duracao: 0.16, volume: 0.28 });
  },

  // Perdeu uma vida sem ser atropelado (entrou na rua com o sinal fechado,
  // ou zerou os pontos). Mais pesado que o aviso leve, mas sem o baque da
  // colisão — a diferença de peso entre os dois é o que ensina, de ouvido,
  // que um erro custou mais caro que o outro.
  avisoGrave() {
    tocarTom({ freq: 220, tipo: 'sawtooth', duracao: 0.14, volume: 0.34 });
    tocarTom({ freq: 165, tipo: 'sawtooth', atraso: 0.12, duracao: 0.3, volume: 0.34 });
  },

  // Atropelamento. Três camadas: a cantada de pneu (ruído agudo caindo), o
  // baque grave e o estouro largo por cima.
  batida() {
    tocarRuido({
      duracao: 0.28,
      volume: 0.3,
      filtro: 'bandpass',
      freqFiltro: 2600,
      freqFinalFiltro: 900,
      q: 6,
    });
    tocarTom({ freq: 150, freqFinal: 45, tipo: 'sawtooth', atraso: 0.16, duracao: 0.35, volume: 0.55 });
    tocarRuido({
      atraso: 0.16,
      duracao: 0.22,
      volume: 0.4,
      filtro: 'lowpass',
      freqFiltro: 1600,
      freqFinalFiltro: 200,
    });
  },

  // --- Trânsito ---------------------------------------------------------
  // Buzina do carro que vai furar o sinal — é o aviso de que aquela rua não
  // vai parar. Duas notas juntas, como as cornetas duplas de um carro real.
  buzina() {
    tocarTom({ freq: A4, tipo: 'sawtooth', duracao: 0.42, volume: 0.24 });
    tocarTom({ freq: 554, tipo: 'sawtooth', duracao: 0.42, volume: 0.24 });
  },

  // Apito do guarda: dois toques curtos. O chiado (ruído de banda estreita
  // bem alto) é o que faz soar como apito, e não como assobio de desenho —
  // o tom puro por baixo só dá corpo.
  apito() {
    for (const atraso of [0, 0.18]) {
      tocarRuido({
        atraso,
        duracao: 0.14,
        volume: 0.42,
        filtro: 'bandpass',
        freqFiltro: 2300,
        q: 18,
        ataque: 0.012,
      });
      tocarTom({ freq: 2300, tipo: 'sine', atraso, duracao: 0.14, volume: 0.12, ataque: 0.012 });
    }
  },

  // --- Fim de partida ---------------------------------------------------
  vitoria() {
    const melodia = [C5, E5, G5, C6];
    melodia.forEach((freq, i) => {
      tocarTom({
        freq,
        tipo: 'square',
        atraso: i * 0.12,
        duracao: i === melodia.length - 1 ? 0.5 : 0.12,
        volume: 0.34,
      });
    });
  },

  derrota() {
    const melodia = [G4, E4, C4];
    melodia.forEach((freq, i) => {
      tocarTom({
        freq,
        tipo: 'triangle',
        atraso: i * 0.16,
        duracao: i === melodia.length - 1 ? 0.6 : 0.17,
        volume: 0.4,
      });
    });
    tocarTom({ freq: C4 / 2, freqFinal: 90, tipo: 'sawtooth', atraso: 0.32, duracao: 0.7, volume: 0.22 });
  },

  // --- Interface --------------------------------------------------------
  clique() {
    tocarTom({ freq: 880, tipo: 'square', duracao: 0.045, volume: 0.2 });
  },
};

// Único ponto de entrada usado pelo jogo. Um nome desconhecido não derruba
// nada: som é acessório, e nenhum erro de digitação aqui deve quebrar uma
// partida.
export function tocar(nome) {
  const som = SONS[nome];
  if (som) som();
}
