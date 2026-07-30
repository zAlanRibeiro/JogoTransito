import React, { useState } from 'react';
import carroVermelho from '../../../assets/carroVermelho.png';
import carroAmarelo from '../../../assets/carroAmarelo.png';
import motoImg from '../../../assets/moto.png';
import onibusImg from '../../../assets/oc2.png';

// Cada tipo de veículo carrega sua própria frota de sprites (só o carro tem
// mais de um, pra variar a cor), a largura visual (vira o "comprimento" do
// veículo na pista depois do rotate(-90deg) no <img>) e um multiplicador
// sobre a duração da animação: <1 anda mais rápido que o carro normal, >1
// mais devagar. Repetir entradas de carro na lista abaixo é o jeito simples
// de pesar a chance de sorteio sem escrever uma função de random ponderado.
// `topOffset` recentraliza o veículo verticalmente dentro da faixa: como a
// rotação de -90deg gira em torno do centro do próprio <img>, mudar a
// largura muda a altura (proporcional) e desloca esse centro — sem essa
// correção por tipo, moto (mais estreita) sobe demais e ônibus (mais largo
// proporcionalmente) desce demais em relação ao carro. Valor calibrado
// medindo o centro real de cada tipo contra o centro da própria faixa.
// `rotacao`: o sprite da moto vem desenhado com a frente para o lado
// oposto do carro/ônibus — girar -90deg (como os outros) deixava ela
// andando de costas. +90deg (180deg de diferença) inverte só a frente/trás,
// sem espelhar a imagem, então não sofre do problema de "perna trocada"
// que travou a arte do boneco antes.
const CARRO = { tipo: 'carro', sprites: [carroVermelho, carroAmarelo], largura: 100, duracaoMultiplicador: 1, topOffset: -17, rotacao: -90 };
const MOTO = { tipo: 'moto', sprites: [motoImg], largura: 62, duracaoMultiplicador: 0.65, topOffset: -7, rotacao: 90 };
const ONIBUS = { tipo: 'onibus', sprites: [onibusImg], largura: 130, duracaoMultiplicador: 1.6, topOffset: -102, rotacao: -90 };

// Repetir entradas é o jeito simples de pesar o sorteio: 3 chances de
// carro, 2 de moto, 1 de ônibus.
const TIPOS_DE_VEICULO = [CARRO, CARRO, CARRO, MOTO, MOTO, ONIBUS];

function sortearTipoDeVeiculo() {
  return TIPOS_DE_VEICULO[Math.floor(Math.random() * TIPOS_DE_VEICULO.length)];
}

export default function Vehicle({ lightState, seed = 0, registerRef, duracaoCarro = 4, furandoSinal = false, onFimDaFurada }) {
  // Tipo do veículo é sorteado uma vez, no mount, e gruda pro resto da vida
  // da faixa — igual ao padrão já usado abaixo pra duracaoFixa. Se o tipo
  // mudasse a cada iteração da animação, a duração/largura mudariam junto
  // no meio do caminho e reabriríamos o mesmo bug do "pulo dos carros" já
  // corrigido antes (mudar propriedades de uma animação CSS em andamento
  // faz o navegador recalcular a posição na hora).
  // Sorteado de verdade, e não derivado do índice da faixa: com
  // `seed % 6` a sequência era sempre carro, carro, moto, ônibus,
  // repetindo a cada duas travessias — o jogador decorava o trajeto e a
  // variedade de veículos não mudava nada na prática.
  const [tipoVeiculo] = useState(sortearTipoDeVeiculo);
  const [carroAtual, setCarroAtual] = useState(
    () => tipoVeiculo.sprites[Math.floor(Math.random() * tipoVeiculo.sprites.length)]
  );
  // `furandoSinal` mantém este veículo andando com o sinal fechado — mas só
  // até o fim da travessia dele (ver onAnimationIteration abaixo).
  const isMoving = lightState !== 'red' || furandoSinal;

  const [duracaoFixa] = useState(() => duracaoCarro * tipoVeiculo.duracaoMultiplicador);

  // O "pulo do gato": usamos o índice da rua para atrasar a animação (de -0s
  // até -duracaoFixa). Com isso, cada carro aparece espalhado pela tela e
  // NUNCA vai bater em outro carro!
  const delay = `-${(Math.abs(Math.sin(seed)) * duracaoFixa).toFixed(2)}s`;

  const sortearNovoCarro = () => {
    if (tipoVeiculo.sprites.length < 2) return; // moto/ônibus só têm 1 sprite — nada pra variar
    const indiceAleatorio = Math.floor(Math.random() * tipoVeiculo.sprites.length);
    setCarroAtual(tipoVeiculo.sprites[indiceAleatorio]);
  };

  // A animação é `infinite`: cada volta é, na prática, um carro novo (é aqui
  // que o sprite é trocado). Furar o sinal é um evento único — UM carro
  // avança e vai embora. Sem avisar o fim da volta, a rua viraria via livre
  // no vermelho, com carro após carro passando enquanto o pedestre atravessa.
  const aoFimDaVolta = () => {
    sortearNovoCarro();
    if (furandoSinal) onFimDaFurada?.();
  };

  return (
    <div className="street-lane">
      <div
        className={`vehicle ${isMoving ? 'moving' : 'stopped'}`}
        style={{ animationDelay: delay, animationDuration: `${duracaoFixa}s`, top: `${tipoVeiculo.topOffset}px` }}
        onAnimationIteration={aoFimDaVolta}
      >
        <img
          src={carroAtual}
          alt=""
          // O ref vai na própria img (o elemento que tem o rotate(-90deg)),
          // não no <div> pai: getBoundingClientRect() só reflete a rotação
          // no elemento em que ela foi aplicada. No pai, o retângulo fica
          // com as dimensões de ANTES de girar — mais curto que o carro
          // real — e a ponta traseira do carro sai de fora dele, por isso
          // não contava como "parado na faixa".
          className="car-image car-hitbox"
          style={{ width: `${tipoVeiculo.largura}px`, transform: `rotate(${tipoVeiculo.rotacao}deg)` }}
          ref={registerRef}
        />
      </div>
    </div>
  );
}
