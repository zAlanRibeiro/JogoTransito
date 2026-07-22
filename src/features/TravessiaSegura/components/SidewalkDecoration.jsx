import React from 'react';
import banco from '../../../assets/banco.png';
import hidrante from '../../../assets/hidrante.png';

const elementosCalcada = [
  { src: banco, width: '90px', height: '45px' },    // Banco proporcional
  { src: hidrante, width: '40px', height: '40px' }  // Hidrante menor e compacto
];

export default function SidewalkDecoration({ seed }) {
  const isLeftSide = Math.sin(seed) > 0;
  
  const posX = isLeftSide 
    ? Math.floor((Math.abs(Math.cos(seed)) * 90) + 35)   
    : Math.floor((Math.abs(Math.sin(seed)) * 90) + 450);  

  const sidewalkIndex = Math.floor(Math.abs(seed) / 3);
  const itemAtual = elementosCalcada[sidewalkIndex % elementosCalcada.length];

  return (
    <div 
      className="sidewalk-decoration"
      style={{
        position: 'absolute',
        left: `${posX}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 3, 
        pointerEvents: 'none'
      }}
    >
      <img 
        src={itemAtual.src} 
        alt="Decoração da Calçada" 
        style={{ 
          width: itemAtual.width, 
          height: itemAtual.height, 
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.3))'
        }} 
      />
    </div>
  );
}