import { useState } from 'react';
import banco from '../../../assets/banco.png';
import hidrante from '../../../assets/hidrante.png';
import arvore from '../../../assets/arvore.png';
import luz from '../../../assets/luz.png';

// Alturas escolhidas por item; a largura sai da proporção real do arquivo
// para o sprite não esticar. Antes o banco era desenhado em 90x45 (2.0)
// sendo que a arte é 71x49 (1.45), e o hidrante em 40x40 sendo 43x54.
const ELEMENTOS = [
  { src: banco, altura: 46, proporcao: 71 / 49 },
  { src: hidrante, altura: 44, proporcao: 43 / 54 },
  { src: arvore, altura: 76, proporcao: 115 / 144 },
  { src: luz, altura: 66, proporcao: 27 / 71 },
];

// Posições seguras: longe do corredor central por onde o jogador anda e da
// faixa de pedestres.
const POSICOES = [42, 104, 452, 514];

function sortearDecoracoes() {
  const quantidade = 1 + Math.floor(Math.random() * 3); // 1 a 3 por calçada
  const vagas = [...POSICOES].sort(() => Math.random() - 0.5).slice(0, quantidade);
  return vagas.map((posX) => ({
    posX,
    item: ELEMENTOS[Math.floor(Math.random() * ELEMENTOS.length)],
  }));
}

export default function SidewalkDecoration() {
  // Sorteado uma vez, no mount. O componente re-renderiza a cada passo do
  // jogador (a cena inteira se move), então sortear no corpo faria a
  // decoração trocar de item e de lugar a cada quadro.
  const [decoracoes] = useState(sortearDecoracoes);

  return (
    <>
      {decoracoes.map(({ posX, item }) => (
        <div
          key={posX}
          className="sidewalk-decoration"
          style={{
            position: 'absolute',
            left: `${posX}px`,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <img
            src={item.src}
            alt=""
            style={{
              width: `${Math.round(item.altura * item.proporcao)}px`,
              height: `${item.altura}px`,
              filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.3))',
            }}
          />
        </div>
      ))}
    </>
  );
}
