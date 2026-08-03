import sinalVerde from '../../../assets/sinalVerde.png';
import sinalAmarelo from '../../../assets/sinalAmarelo.png';
import sinalVermelho from '../../../assets/sinalVermelho.png';

// Altura do sprite na arena, em unidades internas. Fica exportada porque a
// GameArena precisa dela para ancorar o poste pela BASE e para calcular a
// profundidade — antes o número aparecia em três lugares (aqui, no TL_HEIGHT
// e num 120 solto), e o do CSS nem era usado.
export const ALTURA_DO_SEMAFORO = 150;

export default function TrafficLight({ currentLight }) {
  let imagemSinalAtual = sinalVerde;
  if (currentLight === 'yellow') imagemSinalAtual = sinalAmarelo;
  if (currentLight === 'red') imagemSinalAtual = sinalVermelho;

  return (
    <div className="traffic-light-container">
      {/* Decorativa para leitor de tela: o estado do sinal é anunciado por
          uma região viva no GameArena, em português e só quando muda. O alt
          anterior lia "Sinal red". */}
      <img
        src={imagemSinalAtual}
        alt=""
        style={{ height: `${ALTURA_DO_SEMAFORO}px` }}
      />
    </div>
  );
}