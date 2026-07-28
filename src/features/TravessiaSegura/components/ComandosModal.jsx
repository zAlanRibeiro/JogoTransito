// Lista de comandos compartilhada pelo menu inicial e pelo menu de pausa —
// um lugar só pra manter, senão os dois saem de sincronia quando um
// controle muda.
export default function ComandosModal({ onClose, zIndex }) {
  return (
    <div className="modal-overlay" style={zIndex ? { zIndex } : undefined} onClick={onClose}>
      <div
        className="modal-content nit-comandos-modal"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h3>🎮 Comandos</h3>
        <div className="nit-comandos-colunas">
          <div className="nit-comandos-lista">
            <h4>Teclado</h4>
            <div className="nit-comando-linha">
              <span className="nit-tecla-grupo">
                <span className="nit-tecla">W</span>
                <span className="nit-tecla">↑</span>
              </span>
              <span>Andar para frente</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla-grupo">
                <span className="nit-tecla">S</span>
                <span className="nit-tecla">↓</span>
              </span>
              <span>Andar para trás</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla-grupo">
                <span className="nit-tecla">A</span>
                <span className="nit-tecla">D</span>
                <span className="nit-tecla">←</span>
                <span className="nit-tecla">→</span>
              </span>
              <span>Mover para os lados</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla nit-tecla--destaque">E</span>
              <span>Chamar o guarda</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla nit-tecla--larga">Esc</span>
              <span>Pausar o jogo</span>
            </div>
          </div>

          <div className="nit-comandos-lista">
            <h4>Toque (celular/tablet)</h4>
            <div className="nit-comando-linha">
              <span className="nit-tecla-icone">👆</span>
              <span>Segurar a tela — andar para frente</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla-icone">◀▶</span>
              <span>Botões no canto inferior — mover para os lados</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla-icone">🚨</span>
              <span>Botão "Chamar Guarda" — aparece com carro parado na faixa</span>
            </div>
          </div>
        </div>
        <button className="modal-btn" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
