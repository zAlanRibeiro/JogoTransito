// Regra do carro que fura o sinal vermelho. Fica fora do componente para
// poder ser testada sem montar o jogo: é uma decisão de regra, não de
// renderização.
import { crosswalkIndexFor, ordemDaRua } from './gameGrid';

// Distância mínima, contada em RUAS, entre um carro que fura o sinal e o
// próximo. Sem intervalo a exceção viraria rotina e a lição se perderia:
// o jogo ensina a olhar antes de pisar na rua mesmo com o sinal a favor, e
// isso só funciona se o normal continuar sendo o carro que para.
export const RUAS_ENTRE_FURADAS = 3;

/**
 * Decide se algum carro vai furar este fechamento de sinal, e em qual rua.
 *
 * Só concorrem as duas ruas do par que o jogador está para atravessar (ou
 * atravessando): furar o sinal numa rua que ele já deixou para trás, ou numa
 * que ele só alcança dali a várias travessias, não seria visto por ninguém.
 *
 * A chance é consultada só depois do intervalo, então um sorteio barrado pela
 * distância não "gasta" a chance daquele ciclo.
 *
 * @returns {{rua: number, ordem: number} | null} `ordem` é o valor a guardar
 * para alimentar `ultimaOrdem` na chamada seguinte.
 */
export function sortearRuaQueFura({
  indiceDoJogador,
  ultimaOrdem,
  chance,
  aleatorio = Math.random,
}) {
  const ruaLonge = crosswalkIndexFor(indiceDoJogador);
  const candidatas = [ruaLonge - 1, ruaLonge].filter(
    (rua) => ordemDaRua(rua) - ultimaOrdem >= RUAS_ENTRE_FURADAS
  );

  if (candidatas.length === 0) return null;
  if (aleatorio() >= chance) return null;

  // Qual das duas ruas do par é decidido por sorteio: na de perto o risco
  // aparece no instante em que o jogador sai da calçada; na de longe ele tem
  // tempo de ver o carro vindo. As duas lições valem.
  const rua = candidatas[Math.floor(aleatorio() * candidatas.length)];
  return { rua, ordem: ordemDaRua(rua) };
}
