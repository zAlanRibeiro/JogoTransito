import React, { useState } from 'react';
import carroAzul from '../../../assets/carroAzul.png';
import carroBranco from '../../../assets/carroBranco.png';
import carroVerde from '../../../assets/carroVerde.png';
import carroVinho from '../../../assets/carroVinho.png';
import motoImg from '../../../assets/moto.png';
import onibusImg from '../../../assets/oc2.png';
import viaturaImg from '../../../assets/viatura.png';
import viaturaGiroflexImg from '../../../assets/viatura2.png';

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
// Os quatro carros saem do mesmo recorte (52x91), com o desenho centralizado
// numa caixa comum. É isso que deixa uma calibragem só valer para todos: os
// dois carros antigos tinham proporções diferentes (59x70 e 52x70) e
// dividiam um topOffset, então o amarelo ficava 8px fora do centro da faixa
// em relação ao vermelho.
const CARRO = { tipo: 'carro', sprites: [carroAzul, carroBranco, carroVerde, carroVinho], largura: 70, duracaoMultiplicador: 1, topOffset: -11, rotacao: -90 };
const MOTO = { tipo: 'moto', sprites: [motoImg], largura: 62, duracaoMultiplicador: 0.65, topOffset: -7, rotacao: 90 };
const ONIBUS = { tipo: 'onibus', sprites: [onibusImg], largura: 130, duracaoMultiplicador: 1.6, topOffset: -102, rotacao: -90 };
// Viatura da NITTRANS. `spriteGiroflex` é o mesmo desenho com as metades da
// barra do teto invertidas: os dois quadros ficam empilhados e a opacidade
// alterna por CSS, sem nenhum timer em JavaScript (ver .giroflex-piscando).
const VIATURA = {
  tipo: 'viatura',
  sprites: [viaturaImg],
  spriteGiroflex: viaturaGiroflexImg,
  largura: 85,
  duracaoMultiplicador: 1.15,
  // Calibrado medindo no jogo: com -36 o centro dela caía 8px acima do centro
  // da faixa, enquanto o carro comum ficava exato.
  topOffset: -28,
  rotacao: -90,
};

// Repetir entradas é o jeito simples de pesar o sorteio: 3 chances de
// carro, 2 de moto, 1 de ônibus, 1 de viatura.
const TIPOS_DE_VEICULO = [CARRO, CARRO, CARRO, MOTO, MOTO, ONIBUS, VIATURA];

function sortearTipoDeVeiculo() {
  return TIPOS_DE_VEICULO[Math.floor(Math.random() * TIPOS_DE_VEICULO.length)];
}

// Cada passagem é um veículo novo: tipo, sprite e duração sorteados de uma
// vez. A duração é congelada aqui, e não lida a cada render, porque a
// dificuldade muda `duracaoCarro` no meio da partida — trocar a duração de
// uma animação CSS em andamento faz o navegador recalcular a posição na hora,
// e o carro salta na pista.
function sortearVeiculo(duracaoCarro, geracao) {
  const tipo = sortearTipoDeVeiculo();
  return {
    tipo,
    sprite: tipo.sprites[Math.floor(Math.random() * tipo.sprites.length)],
    duracao: duracaoCarro * tipo.duracaoMultiplicador,
    geracao,
  };
}

export default function Vehicle({ lightState, seed = 0, registerRef, duracaoCarro = 4, furandoSinal = false, onFimDaFurada }) {
  // Sorteado de verdade, e não derivado do índice da faixa: com
  // `seed % 6` a sequência era sempre carro, carro, moto, ônibus,
  // repetindo a cada duas travessias — o jogador decorava o trajeto e a
  // variedade de veículos não mudava nada na prática.
  const [veiculo, setVeiculo] = useState(() => sortearVeiculo(duracaoCarro, 0));
  const tipoVeiculo = veiculo.tipo;

  // `furandoSinal` mantém este veículo andando com o sinal fechado — mas só
  // até o fim da travessia dele (ver onAnimationIteration abaixo).
  const isMoving = lightState !== 'red' || furandoSinal;

  // O "pulo do gato": usamos o índice da rua para atrasar a animação (de -0s
  // até -duracao). Com isso, cada carro aparece espalhado pela tela e NUNCA
  // vai bater em outro carro! Só vale para o primeiro: do segundo em diante o
  // veículo entra pela esquerda no tempo certo, sem precisar de adiantamento.
  const delay =
    veiculo.geracao === 0 ? `-${(Math.abs(Math.sin(seed)) * veiculo.duracao).toFixed(2)}s` : '0s';

  // A animação é `infinite`: cada volta é um veículo novo, e é aqui que ele é
  // sorteado — tipo, cor e duração. Antes só a cor mudava e o tipo grudava na
  // faixa pra sempre, então uma rua sorteada como moto passava moto o resto
  // da partida inteira.
  //
  // A troca só pode acontecer NESTE instante, com o veículo fora da tela: a
  // duração da animação muda junto com o tipo, e mexer nela no meio do
  // caminho faz o navegador recalcular a posição e o carro saltar. Por isso a
  // `geracao` entra como key mais abaixo: o elemento é remontado e a animação
  // recomeça do zero em vez de herdar o tempo já corrido.
  const aoFimDaVolta = () => {
    if (furandoSinal) onFimDaFurada?.();
    setVeiculo((atual) => sortearVeiculo(duracaoCarro, atual.geracao + 1));
  };

  return (
    <div className="street-lane">
      <div
        // A key força a remontagem a cada veículo novo, e é ela que zera o
        // relógio da animação — sem isso o navegador manteria o tempo já
        // corrido e aplicaria a duração nova em cima dele, jogando o veículo
        // para o meio da pista.
        key={veiculo.geracao}
        className={`vehicle ${isMoving ? 'moving' : 'stopped'}`}
        style={{ animationDelay: delay, animationDuration: `${veiculo.duracao}s`, top: `${tipoVeiculo.topOffset}px` }}
        onAnimationIteration={aoFimDaVolta}
      >
        <img
          src={veiculo.sprite}
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
        {/* Quadro do giroflex por cima, na mesma geometria. Sem a classe
            car-image de propósito: quem mede o veículo (radar do guarda,
            colisão, testes) precisa continuar encontrando um só elemento. */}
        {tipoVeiculo.spriteGiroflex && (
          <img
            src={tipoVeiculo.spriteGiroflex}
            alt=""
            className="giroflex-piscando"
            style={{ width: `${tipoVeiculo.largura}px`, transform: `rotate(${tipoVeiculo.rotacao}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
