import React, { useState } from 'react';
import carroVermelho from '../../../assets/carroVermelho.png';
import carroAmarelo from '../../../assets/carroAmarelo.png';

const frotaDeCarros = [carroVermelho, carroAmarelo];

export default function Vehicle({ lightState, seed = 0 }) {
  // Pega um carro fixo para esta rua baseado no índice (seed)
  const [carroAtual, setCarroAtual] = useState(frotaDeCarros[Math.abs(seed) % frotaDeCarros.length]);
  const isMoving = lightState !== 'red';

  // O "pulo do gato": usamos o índice da rua para atrasar a animação (de -0s até -4s).
  // Com isso, cada carro aparece espalhado pela tela e NUNCA vai bater em outro carro!
  const [delay] = useState(`-${(Math.abs(Math.sin(seed)) * 4).toFixed(2)}s`);

  const sortearNovoCarro = () => {
    const indiceAleatorio = Math.floor(Math.random() * frotaDeCarros.length);
    setCarroAtual(frotaDeCarros[indiceAleatorio]);
  };

  return (
    <div className="street-lane">
      <div 
        className={`vehicle ${isMoving ? 'moving' : 'stopped'}`}
        style={{ animationDelay: delay }}
        onAnimationIteration={sortearNovoCarro}
      >
        <img 
          src={carroAtual} 
          alt="Carro passando" 
          /* Adicionamos a classe car-hitbox que o nosso radar procura */
          className="car-image car-hitbox" 
        />
      </div>
    </div>
  );
}