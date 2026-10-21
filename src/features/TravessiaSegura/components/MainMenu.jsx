import { useState } from 'react';
// IMPORTANTE: Ajuste este caminho ../../../assets/agente.png se a sua imagem estiver em outro lugar!
import agenteImg from '../../../assets/agente.png';
import ComandosModal from './ComandosModal';
import TutorialModal from './TutorialModal';

export default function MainMenu({ onStartGame }) {
  const [mostrarComandos, setMostrarComandos] = useState(false);
  const [mostrarTutorial, setMostrarTutorial] = useState(false);

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
            <img src={agenteImg} alt="" className="nit-agent-img" />
          </div>

          <div className="nit-instructions">
            <div className="nit-instrucoes-topo">
              <h3>Instruções do Agente:</h3>
              <button className="nit-tutorial-btn" onClick={() => setMostrarTutorial(true)}>
                ▶ Ver tutorial
              </button>
            </div>
            {/* Textos curtos de propósito: são cinco cartões em duas
                colunas dentro de um cartão de altura fixa, e cada linha a
                mais de texto empurra a última regra para fora da vista.
                Nada de <strong> no meio da frase — o CSS o desenha como
                bloco (é o título do cartão) e ele quebraria a linha. O emoji
                vai dentro do título: fora dele, ocupava uma linha só sua e,
                na arena de 600 de largura, o cartão estourava e cortava o
                "Instruções do Agente" no topo. */}
            <ul>
              <li><strong>🛑 Espere o Sinal:</strong> no verde e no amarelo o carro ainda passa.</li>
              <li><strong>⚠️ Termine a Travessia:</strong> ficar preso na rua ao fechar custa pontos ou vida.</li>
              <li><strong>🚧 Fique na Faixa:</strong> fora dela, seus pontos valem metade.</li>
              <li><strong>🚲 Olhe a Ciclovia:</strong> a faixa vermelha tem bicicleta, e ela não para no sinal.</li>
              <li><strong>🚨 Peça Reforço:</strong> carro parado na faixa? Chame o guarda (tecla E).</li>
            </ul>
          </div>
        </div>

        <button className="nit-start-btn" onClick={onStartGame}>
          INICIAR JOGO
        </button>

      </div>

      {mostrarComandos && <ComandosModal onClose={() => setMostrarComandos(false)} />}
      {mostrarTutorial && <TutorialModal onClose={() => setMostrarTutorial(false)} onJogar={onStartGame} />}
    </div>
  );
}