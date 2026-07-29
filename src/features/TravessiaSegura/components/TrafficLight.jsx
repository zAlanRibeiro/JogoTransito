import React from 'react';
import sinalVerde from '../../../assets/sinalVerde.png';
import sinalAmarelo from '../../../assets/sinalAmarelo.png';
import sinalVermelho from '../../../assets/sinalVermelho.png';

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
        style={{ height: '120px' }}
      />
    </div>
  );
}