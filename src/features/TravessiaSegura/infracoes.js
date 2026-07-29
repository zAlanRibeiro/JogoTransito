// Catálogo de infrações: rótulos, agrupamento por gravidade e o estado
// zerado. Fica fora do componente de resumo porque misturar constantes com
// exportação de componente quebra o fast refresh do Vite.

export const LABELS_INFRACAO = {
  carro: 'Atropelamentos',
  sinalEntrada: 'Atravessou com o sinal fechado',
  sinalAberto: 'Ficou preso na rua quando o sinal abriu',
  faixa: 'Atravessou fora da faixa',
  pontosZerados: 'Perdeu vida sem pontos pra descontar',
};

// Mesma divisão usada no banner de aviso durante o jogo: 'leve' só tira
// pontos, 'grave' tira vida.
export const TIPOS_POR_GRAVIDADE = {
  leve: ['sinalAberto', 'faixa'],
  grave: ['carro', 'sinalEntrada', 'pontosZerados'],
};

export const INFRACOES_ZERADAS = {
  carro: 0,
  sinalEntrada: 0,
  sinalAberto: 0,
  faixa: 0,
  pontosZerados: 0,
};

export function totalDeInfracoes(infracoes) {
  return Object.values(infracoes).reduce((soma, n) => soma + n, 0);
}

export function totalPorGravidade(infracoes, gravidade) {
  return TIPOS_POR_GRAVIDADE[gravidade].reduce((soma, tipo) => soma + infracoes[tipo], 0);
}
