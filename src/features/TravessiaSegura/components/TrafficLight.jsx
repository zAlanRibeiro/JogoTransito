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
      <img 
        src={imagemSinalAtual} 
        alt={`Sinal ${currentLight}`} 
        style={{ height: '120px' }} 
      />
    </div>
  );
}