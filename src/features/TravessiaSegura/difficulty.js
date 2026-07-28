// Progressão de dificuldade: a cada PONTOS_POR_NIVEL pontos, o jogo fica um
// pouco mais rápido (sinal fecha mais cedo, carros passam mais rápido),
// até um teto — nunca a ponto de ficar impossível de atravessar.
const PONTOS_POR_NIVEL = 30;
const NIVEL_MAXIMO = 8;

export function calcularDificuldade(pontos) {
  const nivel = Math.min(Math.floor(Math.max(0, pontos) / PONTOS_POR_NIVEL), NIVEL_MAXIMO);

  return {
    nivel,
    // Tempo de sinal verde e vermelho, em segundos inteiros (o cronômetro
    // do HUD conta segundo a segundo, então nada de valor fracionado aqui).
    duracaoVerde: Math.round(Math.max(3, 6 - nivel * 0.35)),
    duracaoVermelho: Math.round(Math.max(3, 5 - nivel * 0.25)),
    // Duração da animação do carro atravessando a pista (pode ser fracionada
    // — não alimenta nenhum contador visível). Quanto menor, mais rápido.
    duracaoCarro: Math.max(2, 4 - nivel * 0.25),
  };
}
