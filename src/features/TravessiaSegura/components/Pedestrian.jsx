import { useState, useEffect } from 'react';
import bonecoParado from '../../../assets/bonecoParado.png';
import bonecoAndando1 from '../../../assets/bonecoAndando1.png';
import bonecoAndando2 from '../../../assets/bonecoAndando2.png';
import bonecoAndando3 from '../../../assets/bonecoAndando3.png';

const cicloDeCaminhada = [bonecoAndando1, bonecoAndando2, bonecoAndando3, bonecoAndando2];

export default function Pedestrian({ isWalking, isRespawning = false, x, y = 0, zIndex = 80, registerRef }) {
  const [frameIndex, setFrameIndex] = useState(0);

  // Parado não anima: o efeito simplesmente não liga o relógio. A versão
  // anterior zerava o quadro no `else`, o que era um setState no corpo de um
  // efeito — um render extra para trocar um número que ninguém ia ler,
  // porque parado o boneco usa `bonecoParado` e o índice fica ocioso.
  // Deixando o índice onde estava, o ciclo retoma de onde parou ao voltar a
  // andar, o que é indistinguível num ciclo de quatro quadros.
  useEffect(() => {
    if (!isWalking) return;
    const relogio = setInterval(() => setFrameIndex((anterior) => anterior + 1), 150);
    return () => clearInterval(relogio);
  }, [isWalking]);

  // O módulo fica na leitura, e não no setState, para que o índice possa
  // crescer livremente sem precisar ser normalizado a cada passo.
  const imagemAtual = isWalking
    ? cicloDeCaminhada[frameIndex % cicloDeCaminhada.length]
    : bonecoParado;

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
      <img src={imagemAtual} alt="" style={{ width: '28px' }} />
    </div>
  );
}