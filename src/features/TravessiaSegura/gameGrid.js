// Fonte única do padrão de segmentos do trajeto (calçada/rua), usado tanto
// na renderização (GameArena) quanto na física do jogador (usePlayerMovement),
// para que "em que tipo de piso o jogador está" nunca seja calculado de
// duas formas diferentes e saia dessincronizado.
export const SEGMENT_HEIGHT = 100;
export const PATTERN = ['calcada', 'rua', 'rua'];
export const CYCLE_LENGTH = SEGMENT_HEIGHT * PATTERN.length;

// Largura real da faixa de pedestre — precisa bater com `.crosswalk` no
// App.css. Usada pelo radar de "carro parado na faixa" pra medir quanto do
// carro realmente cobre a faixa, em vez de só olhar se ele encosta perto
// do centro dela.
export const CROSSWALK_WIDTH = 110;

// Módulo que sempre devolve um resultado positivo, ao contrário do operador
// `%` do JS (que preserva o sinal do dividendo). Necessário em qualquer
// lugar que precise "onde dentro do ciclo" o jogador está quando ele pode
// andar para trás e Y fica negativo.
export function properMod(n, m) {
  return ((n % m) + m) % m;
}

export function mod3(i) {
  return properMod(i, 3);
}

export function segmentType(i) {
  return PATTERN[mod3(i)];
}

// Limites (em Y "local", dentro de um ciclo de 300) que definem onde o
// asfalto realmente começa/termina para fins de jogabilidade — mais
// apertado que o segmento bruto de 100px da calçada, pra compensar o
// tamanho do sprite do jogador. Usado tanto pra travar a entrada na rua
// (usePlayerMovement) quanto pra decidir se o jogador "ainda está na rua"
// quando o sinal fecha (GameArena) — as duas checagens precisam concordar,
// senão o jogo pode achar que alguém visualmente já na calçada ainda está
// na rua (ou vice-versa).
const MARGEM_INICIO_ASFALTO = 85;
const MARGEM_FIM_ASFALTO = 235;

export function estaNaCalcadaComMargem(y) {
  const localY = properMod(y, CYCLE_LENGTH);
  return localY <= MARGEM_INICIO_ASFALTO || localY >= MARGEM_FIM_ASFALTO;
}

// A faixa de pedestre (.crosswalk) é renderizada ancorada na rua "de longe"
// de cada par (mod3 === 2) e cobre as duas ruas do par. Dado um segmento
// qualquer — calçada ou rua —, devolve o índice da faixa que é relevante
// para quem está ali: a do próprio par, se já estiver numa rua; a do
// PRÓXIMO par, se ainda estiver numa calçada.
export function crosswalkIndexFor(segmentIndex) {
  const m = mod3(segmentIndex);
  if (m === 2) return segmentIndex; // já na rua "de longe" do par
  if (m === 1) return segmentIndex + 1; // já na rua "de perto" do par
  return segmentIndex + 2; // na calçada, mira o próximo par
}
