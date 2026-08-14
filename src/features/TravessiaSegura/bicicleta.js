// Regra de quando aparece uma bicicleta na rota. Fica fora do componente
// pelo mesmo motivo do furarSinal.js: é decisão de regra, não de
// renderização, e assim dá pra testar sem montar o jogo.
//
// A conta é sempre em RUAS PERCORRIDAS desde a última bicicleta (ver
// ordemDaRua no gameGrid): enquanto a bicicleta não vem, a chance sobe; no
// instante em que ela aparece, a contagem zera e tudo recomeça do 1%.
//
//   menos de 20 ruas ....  1%   (aparecer aqui é sorte grande)
//   20 a 29 ruas ........ 20%
//   30 a 39 ruas ........ 30%
//   40 a 49 ruas ........ 40%   ... e assim por diante, até 100%
//
// O 1% do começo não é enfeite: ele deixa a bicicleta possível a qualquer
// momento, então o jogador nunca pode assumir que aquela rua está livre só
// porque a anterior tinha uma.
import { mod3, ordemDaRua, segmentType } from './gameGrid';

export const CHANCE_ANTES_DO_PRAZO = 0.01;
export const RUAS_ATE_A_CHANCE_CHEIA = 20;
export const CHANCE_NO_PRAZO = 0.2;
export const RUAS_POR_AUMENTO = 10;
export const AUMENTO_POR_ETAPA = 0.1;

/** Chance (0 a 1) de bicicleta numa rua, dadas as ruas desde a última. */
export function chanceDeBicicleta(ruasDesdeAUltima) {
  if (ruasDesdeAUltima < RUAS_ATE_A_CHANCE_CHEIA) return CHANCE_ANTES_DO_PRAZO;

  const etapas = Math.floor((ruasDesdeAUltima - RUAS_ATE_A_CHANCE_CHEIA) / RUAS_POR_AUMENTO);
  return Math.min(1, CHANCE_NO_PRAZO + etapas * AUMENTO_POR_ETAPA);
}

/**
 * Sorteia se ESTA rua recebe ciclovia com bicicleta.
 *
 * `ordem` e `ultimaOrdem` são posições contadas em ruas (ordemDaRua), não
 * índices de segmento: entre a rua de índice 2 e a de índice 4 existe uma
 * calçada, então índice não serve para medir distância percorrida.
 *
 * @returns {boolean}
 */
export function sortearBicicleta({ ordem, ultimaOrdem, aleatorio = Math.random }) {
  return aleatorio() < chanceDeBicicleta(ordem - ultimaOrdem);
}

/**
 * Ciclovia só na rua que encosta na calçada — a primeira de cada par, a que
 * o jogador pisa ao sair do meio-fio (mod3 === 1 no PATTERN do gameGrid).
 *
 * Ciclovia de verdade corre pela beirada da via, do lado da calçada, nunca
 * no meio da pista. A outra rua do par tem rua dos dois lados: uma faixa
 * vermelha ali seria uma ciclovia no meio do asfalto.
 */
export function ruaAceitaCiclovia(indiceDoSegmento) {
  return segmentType(indiceDoSegmento) === 'rua' && mod3(indiceDoSegmento) === 1;
}

/**
 * Cria o sorteador de ciclovias de UMA partida.
 *
 * A chance de uma rua depende de quantas ruas passaram desde a última
 * bicicleta, então a decisão da rua N precisa das decisões de 1 até N-1 —
 * é uma sequência, não um sorteio isolado. O sorteador guarda essa
 * sequência e a preenche sob demanda: perguntar pela rua 12 decide de uma
 * vez tudo o que vem antes dela, e pronto.
 *
 * A distância continua contada em TODAS as ruas percorridas, mesmo as que
 * não podem receber ciclovia — é o trajeto do jogador que faz a chance
 * subir. O que a rua inelegível não faz é gastar sorteio: ela é descartada
 * antes, como no furarSinal.js.
 *
 * Por que isso importa: a resposta pode ser lida durante o render (que é
 * onde a cena precisa dela, para saber se pinta o asfalto de ciclovia).
 * Perguntar duas vezes pela mesma rua devolve sempre o mesmo resultado,
 * inclusive na dupla renderização do StrictMode, e um render descartado pelo
 * React não deixa nada inconsistente para trás — a decisão de cada rua é
 * tomada uma vez só e nunca muda.
 *
 * @returns {(indiceDoSegmento: number) => boolean} responde se aquele
 * segmento é uma rua com ciclovia.
 */
// Interruptor de QA: com esta chave ligada no localStorage, TODA rua
// elegível vira ciclovia.
//
//     localStorage.setItem('travessiaSegura_cicloviaSempre', '1')
//
// Existe porque a regra é rara de propósito — 1% no começo — e sem ela não
// há como um teste de ponta a ponta encontrar uma bicicleta, nem como
// conferir a cena à mão sem editar o código. O jogo normal não muda: sem a
// chave, o sorteio é o de sempre.
export const CHAVE_CICLOVIA_SEMPRE = 'travessiaSegura_cicloviaSempre';

export function sorteioDeCiclovias() {
  try {
    // 0 passa em qualquer chance, inclusive na de 1%.
    if (localStorage.getItem(CHAVE_CICLOVIA_SEMPRE) === '1') return () => 0;
  } catch {
    // Sem localStorage (aba anônima restrita, iframe com sandbox): segue o
    // sorteio normal, como no recorde.
  }
  return Math.random;
}

export function criarSorteadorDeCiclovias(aleatorio = Math.random) {
  const decididos = new Map();
  let ultimaOrdemComBicicleta = 0;
  let maiorDecidido = 0;

  return function temCiclovia(indiceDoSegmento) {
    while (maiorDecidido < indiceDoSegmento) {
      maiorDecidido += 1;
      if (!ruaAceitaCiclovia(maiorDecidido)) continue;

      const ordem = ordemDaRua(maiorDecidido);
      const tem = sortearBicicleta({ ordem, ultimaOrdem: ultimaOrdemComBicicleta, aleatorio });
      if (tem) ultimaOrdemComBicicleta = ordem;
      decididos.set(maiorDecidido, tem);
    }
    return decididos.get(indiceDoSegmento) === true;
  };
}
