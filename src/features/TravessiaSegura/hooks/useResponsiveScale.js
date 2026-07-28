import { useEffect, useState } from 'react';

// Calcula um fator de escala para que uma arena de tamanho fixo
// (baseWidth x baseHeight, em px) caiba na tela sem cortar nem
// exigir scroll, mantendo a proporção e o sistema de coordenadas
// interno do jogo intacto (só a apresentação visual muda).
export default function useResponsiveScale(baseWidth, baseHeight, { padding = 24, maxScale = 1.4, minScale = 0.3 } = {}) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calcularEscala = () => {
      const larguraDisponivel = window.innerWidth - padding;
      const alturaDisponivel = window.innerHeight - padding;
      const escalaCalculada = Math.min(
        larguraDisponivel / baseWidth,
        alturaDisponivel / baseHeight,
        maxScale
      );
      setScale(Math.max(escalaCalculada, minScale));
    };

    calcularEscala();
    window.addEventListener('resize', calcularEscala);
    window.addEventListener('orientationchange', calcularEscala);
    return () => {
      window.removeEventListener('resize', calcularEscala);
      window.removeEventListener('orientationchange', calcularEscala);
    };
  }, [baseWidth, baseHeight, padding, maxScale, minScale]);

  return scale;
}
