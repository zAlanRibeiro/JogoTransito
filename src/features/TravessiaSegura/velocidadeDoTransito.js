// Normalização da velocidade do trânsito para a largura da arena.
//
// Vivia dentro do Vehicle.jsx, e saiu de lá quando a bicicleta passou a
// precisar da mesma conta: sem uma fonte única, os dois tipos de veículo
// derivariam para velocidades diferentes na mesma tela — que é exatamente o
// bug que esta conta existe para evitar.

// Quanto o veículo percorre de ponta a ponta, em coordenadas da arena: ele
// nasce em left:-150px e a animação `drive` o leva de translateX(-150px) até
// (largura + 200px) — ou seja, de -300 até largura+50.
export const varreduraDaTravessia = (larguraDaArena) => larguraDaArena + 350;

// A varredura de referência, de quando a arena tinha 600px fixos de largura.
// É nela que a duração do difficulty.js foi calibrada.
export const VARREDURA_DE_REFERENCIA = varreduraDaTravessia(600);

// A duração acompanha a LARGURA da arena, e não é o valor cru do
// difficulty.js.
//
// Desde que a arena passou a ter largura elástica, o mesmo tempo cobria
// distâncias diferentes: num celular deitado a varredura é de 1349px contra
// 997 no desktop. Medido, o carro andava a 356px/s no celular e 250 no
// computador — 1,48x contra 1,04x a velocidade do jogador, que é fixa em
// 240px/s. O trânsito ficava 42% mais rápido em relação a quem atravessa, e
// só no celular.
//
// Esticando a duração na mesma proporção, o carro volta a andar sempre a
// ~238px/s em qualquer tela. O efeito colateral é que numa tela larga cada
// veículo demora mais para dar a volta, então passa um pouco menos carro por
// minuto — um trânsito mais espaçado, porém na velocidade certa, que é o que
// o jogo precisa para ensinar a julgar quando dá para atravessar.
export const duracaoParaALargura = (duracaoBase, larguraDaArena) =>
  duracaoBase * (varreduraDaTravessia(larguraDaArena) / VARREDURA_DE_REFERENCIA);
