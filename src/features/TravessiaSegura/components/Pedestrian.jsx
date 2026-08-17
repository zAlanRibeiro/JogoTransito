import { useState, useEffect } from 'react';
import bonecoParado from '../../../assets/bonecoParado.png';
import bonecoAndando1 from '../../../assets/bonecoAndando1.png';
import bonecoAndando2 from '../../../assets/bonecoAndando2.png';
import bonecoAndando3 from '../../../assets/bonecoAndando3.png';

const cicloDeCaminhada = [bonecoAndando1, bonecoAndando2, bonecoAndando3, bonecoAndando2];

export default function Pedestrian({ isWalking, isRespawning = false, isMorrendo = false, x, y = 0, zIndex = 80, registerRef }) {
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
      // 'morrendo': a última vida acabou e o boneco pisca parado onde caiu,
      // até as nuvens da cutscene de derrota cobrirem a cena.
      className={`pedestrian ${isRespawning ? 'respawning' : ''} ${isMorrendo ? 'morrendo' : ''}`}
      ref={registerRef}
      style={{
        bottom: `${20 + y}px`, // 20px de folga na calçada inicial + progresso real no tabuleiro
        left: `${x}px`, // Move livremente para os lados com A e D!
        transform: 'translateX(-50%)',
        position: 'absolute',
        zIndex
      }}
    >
      {/* Escalado pela LARGURA, de propósito.
          Os quadros foram exportados com recorte justo, então cada um tem
          largura diferente conforme o braço balança (104, 119, 108 e 122px)
          enquanto a altura é quase a mesma nos quatro. O efeito é que o
          boneco sobe e desce ~9px a cada 150ms enquanto anda — medido no
          jogo. Fixar a altura tiraria esse balanço, mas a caminhada fica
          dura; o pula-pula é o que dá vida a ela, e foi escolha mantê-lo. */}
      <img src={imagemAtual} alt="" style={{ width: '28px' }} />
    </div>
  );
}