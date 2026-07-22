import React from 'react';
import sinalVerde from '../../../assets/sinalVerde.png';
import sinalAmarelo from '../../../assets/sinalAmarelo.png';
import sinalVermelho from '../../../assets/sinalVermelho.png';

export default function TrafficLight({ currentLight, timeLeft }) {
  let imagemSinalAtual = sinalVerde;
  if (currentLight === 'yellow') imagemSinalAtual = sinalAmarelo;
  if (currentLight === 'red') imagemSinalAtual = sinalVermelho;

  // Texto dinâmico do status automático
  let statusTexto = `Aguarde: ${timeLeft}s`;
  if (currentLight === 'yellow') statusTexto = `Atenção: ${timeLeft}s`;
  if (currentLight === 'red') statusTexto = `Atravesse: ${timeLeft}s`;

  return (
    <div className="traffic-light-container">
      <img src={imagemSinalAtual} alt={`Sinal ${currentLight}`} style={{ height: '120px' }} />
      
      {/* Badge informativo sem botões de clique */}
      <div 
        style={{
          marginTop: '6px',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          backgroundColor: currentLight === 'red' ? '#2ecc71' : '#e74c3c',
          color: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap'
        }}
      >
        {statusTexto}
      </div>
    </div>
  );
}