import React, { useState, useEffect } from 'react';
import bonecoParado from '../../../assets/bonecoParado.png';
import bonecoAndando1 from '../../../assets/bonecoAndando1.png';
import bonecoAndando2 from '../../../assets/bonecoAndando2.png';
import bonecoAndando3 from '../../../assets/bonecoAndando3.png';

const cicloDeCaminhada = [bonecoAndando1, bonecoAndando2, bonecoAndando3, bonecoAndando2];

export default function Pedestrian({ isWalking, isRespawning = false, x, y = 0, zIndex = 80, registerRef }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let interval;
    if (isWalking) {
      interval = setInterval(() => {
        setFrameIndex((prevIndex) => (prevIndex + 1) % cicloDeCaminhada.length);
      }, 150);
    } else {
      setFrameIndex(0);
    }
    return () => clearInterval(interval);
  }, [isWalking]);

  const imagemAtual = isWalking ? cicloDeCaminhada[frameIndex] : bonecoParado;

  return (
    <div
      className={`pedestrian ${isRespawning ? 'respawning' : ''}`}
      ref={registerRef}
      style={{
        bottom: `${20 + y}px`, // 20px de folga na calçada inicial + progresso real no tabuleiro
        left: `${x}px`, // Move livremente para os lados com A e D!
        transform: 'translateX(-50%)',
        position: 'absolute',
        zIndex
      }}
    >
      {/* 👇 Alterado o width de 40px para 28px para deixar o boneco menor e mais proporcional */}
      <img src={imagemAtual} alt="Pedestre" style={{ width: '28px' }} />
    </div>
  );
}