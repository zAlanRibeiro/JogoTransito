import React, { useState } from 'react';
// IMPORTANTE: Ajuste este caminho ../../../assets/agente.png se a sua imagem estiver em outro lugar!
import agenteImg from '../../../assets/agente.png';
import ComandosModal from './ComandosModal';

export default function MainMenu({ onStartGame }) {
  const [mostrarComandos, setMostrarComandos] = useState(false);

  return (
    <div className="nit-menu-container">
      <div className="nit-menu-card">
        <button
          className="nit-comandos-btn"
          onClick={() => setMostrarComandos(true)}
          aria-label="Ver comandos do jogo"
        >
          ❓ Comandos
        </button>

        <div className="nit-header">
          <span className="nit-badge">GESTÃO E MODERNIZAÇÃO</span>
          <h1>Travessia Segura</h1>
          <p>Niterói • NITTRANS</p>
          <span className="nit-veiculos-aviso">🚗 🏍️ 🚌 trânsito variado</span>
        </div>

        <div className="nit-content">
          <div className="nit-agent-wrapper">
            {/* Imagem do guarda renderizada aqui */}
            <img src={agenteImg} alt="Agente NitTrans" className="nit-agent-img" />
          </div>

          <div className="nit-instructions">
            <h3>Instruções do Agente:</h3>
            <ul>
              <li>🛑 <strong>Espere o Sinal:</strong> só atravesse quando abrir — no verde e no amarelo os carros ainda passam.</li>
              <li>⚠️ <strong>Termine a Travessia:</strong> ficar preso na rua ao fechar o sinal custa pontos ou vida.</li>
              <li>🚧 <strong>Fique na Faixa:</strong> atravessar fora da faixa de pedestres corta seus pontos pela metade.</li>
              <li>🚨 <strong>Peça Reforço:</strong> carro parado na faixa? Chame o guarda (tecla E).</li>
            </ul>
          </div>
        </div>

        <button className="nit-start-btn" onClick={onStartGame}>
          INICIAR JOGO
        </button>

      </div>

      {mostrarComandos && <ComandosModal onClose={() => setMostrarComandos(false)} />}
    </div>
  );
}