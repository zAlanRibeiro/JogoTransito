import React from 'react';
// IMPORTANTE: Ajuste este caminho ../../../assets/agente.png se a sua imagem estiver em outro lugar!
import agenteImg from '../../../assets/agente.png'; 

export default function MainMenu({ onStartGame }) {
  return (
    <div className="nit-menu-container">
      <div className="nit-menu-card">
        
        <div className="nit-header">
          <span className="nit-badge">GESTÃO E MODERNIZAÇÃO</span>
          <h1>Travessia Segura</h1>
          <p>Niterói • NITTRANS</p>
        </div>

        <div className="nit-content">
          <div className="nit-agent-wrapper">
            {/* Imagem do guarda renderizada aqui */}
            <img src={agenteImg} alt="Agente NitTrans" className="nit-agent-img" />
          </div>

          <div className="nit-instructions">
            <h3>Instruções do Agente:</h3>
            <ul>
              <li>🛑 <strong>Respeite o Semáforo:</strong> Atravesse apenas no sinal vermelho para os carros.</li>
              <li>⚠️ <strong>Atenção ao Tempo:</strong> Ficar preso na rua ao abrir o sinal gera pontos negativos.</li>
              <li>🚗 <strong>Evite Acidentes:</strong> Cuidado com os veículos na pista!</li>
            </ul>
          </div>
        </div>

        <button className="nit-start-btn" onClick={onStartGame}>
          INICIAR JOGO
        </button>

      </div>
    </div>
  );
}