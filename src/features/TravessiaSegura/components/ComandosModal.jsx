// Lista de comandos compartilhada pelo menu inicial e pelo menu de pausa —
// um lugar só pra manter, senão os dois saem de sincronia quando um
// controle muda.
export default function ComandosModal({ onClose, zIndex }) {
  return (
    <div className="modal-overlay" style={zIndex ? { zIndex } : undefined} onClick={onClose}>
      <div
        className="modal-content nit-comandos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-comandos"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h3 id="titulo-comandos">🎮 Comandos</h3>
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
              <span className="nit-tecla-icone">🕹️</span>
              <span>Joystick no canto inferior esquerdo — andar em qualquer direção</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla-icone">↩️</span>
              <span>Puxe o joystick para baixo para recuar até a calçada</span>
            </div>
            <div className="nit-comando-linha">
              <span className="nit-tecla-icone">🚨</span>
              <span>Botão "Chamar Guarda" — aparece com carro parado na faixa</span>
            </div>
          </div>
        </div>
        {/* Leva o foco do teclado para dentro do diálogo ao abrir. */}
        <button className="modal-btn" onClick={onClose} autoFocus>
          Entendi
        </button>
      </div>
    </div>
  );
}
