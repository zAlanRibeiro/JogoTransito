import { useCallback, useEffect, useState } from 'react';

// Mede a arena para a tela: devolve a LARGURA em coordenadas internas do jogo
// e a ESCALA visual aplicada por cima dela.
//
// A altura é fixa e continua sendo: o sistema de coordenadas do jogo depende
// dela (segmentos de 100px, posição da câmera, margens de colisão calibradas
// em usePlayerMovement). Quem passou a ser elástica é a largura.
//
// O motivo é medido, não estético. Antes a largura também era fixa em 600, e
// a escala saía de min(disponível/600, disponível/400). Celular deitado é
// largo e baixo — um Pixel 7 em paisagem tem proporção 2,4 contra 1,5 da
// arena — então quem mandava era SEMPRE a altura, e sobravam tarjas vazias
// nas laterais:
//
//     Pixel 7      863x360 -> arena 504x336, sobra 359px  (42% da tela)
//     iPhone 12    750x340 -> arena 474x316, sobra 276px  (37%)
//     Galaxy S9+   658x320 -> arena 444x296, sobra 214px  (33%)
//     iPhone SE    568x320 -> arena 444x296, sobra 124px  (22%)
//
// Com a largura acompanhando a proporção do espaço livre, a arena preenche a
// tela nos dois eixos. O que aparece na área recuperada é mais rua dos lados
// — que é de onde os carros vêm de qualquer jeito, então não muda o que o
// jogador precisa olhar.
//
// O piso de 600 garante que nenhuma tela fique com MENOS jogo do que tinha
// antes; o teto evita que num monitor ultralargo a arena vire uma fita.
export default function useArenaResponsiva(
  altura,
  { padding = 24, maxScale = 2.6, minScale = 0.3, larguraMin = 600, larguraMax = 1000 } = {}
) {
  // A medida é feita JÁ no primeiro render, e não só dentro do efeito.
  // Começando com um valor provisório, o jogador nascia no meio de uma arena
  // de 600 e a largura real chegava um render depois — ele ficava parado a
  // 30% da tela, longe da faixa de pedestre, porque a posição inicial é
  // capturada uma vez só (useRef) e não acompanha a correção.
  const medir = useCallback(() => {
    if (typeof window === 'undefined') return { largura: larguraMin, escala: 1 };
    const dispW = Math.max(window.innerWidth - padding, 1);
    const dispH = Math.max(window.innerHeight - padding, 1);

    // A largura que faria a arena ter exatamente a proporção do espaço
    // livre. Nela, os dois limites da escala empatam e não sobra tarja.
    const ideal = altura * (dispW / dispH);
    const largura = Math.round(Math.min(Math.max(ideal, larguraMin), larguraMax));

    const escala = Math.min(dispW / largura, dispH / altura, maxScale);
    return { largura, escala: Math.max(escala, minScale) };
  }, [altura, padding, maxScale, minScale, larguraMin, larguraMax]);

  const [medidas, setMedidas] = useState(medir);

  useEffect(() => {
    const calcular = () => setMedidas(medir());

    calcular();
    window.addEventListener('resize', calcular);
    window.addEventListener('orientationchange', calcular);
    return () => {
      window.removeEventListener('resize', calcular);
      window.removeEventListener('orientationchange', calcular);
    };
  }, [medir]);

  return medidas;
}
