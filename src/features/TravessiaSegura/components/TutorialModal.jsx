import { useEffect, useState } from 'react';
import carroAzul from '../../../assets/carroAzul.png';
import carroBranco from '../../../assets/carroBranco.png';
import carroVerde from '../../../assets/carroVerde.png';
import carroVinho from '../../../assets/carroVinho.png';
import bonecoParado from '../../../assets/bonecoParado.png';
import bonecoAndando1 from '../../../assets/bonecoAndando1.png';
import bonecoAndando2 from '../../../assets/bonecoAndando2.png';
import bonecoAndando3 from '../../../assets/bonecoAndando3.png';
import agente1 from '../../../assets/agente_1.png';
import agente2 from '../../../assets/agente_2.png';
import agente3 from '../../../assets/agente_3.png';
import agente6 from '../../../assets/agente_6.png';
import agente7 from '../../../assets/agente_7.png';
import TrafficLight, { ALTURA_DO_SEMAFORO } from './TrafficLight';
import { CheckIcon, GraveWarningIcon, HeartIcon, HourglassIcon, WarningIcon } from './HudIcons';
import { BONUS_CHAMAR_GUARDA } from '../hooks/useGuardSystem';
import { PASSOS, noTrecho, naTrajetoria } from '../tutorial';

const CARROS = { azul: carroAzul, branco: carroBranco, verde: carroVerde, vinho: carroVinho };
// Os mesmos ciclos do Pedestrian e do AgenteAnimado, mas contados pelo relógio
// da cena: assim o passo do boneco nunca se desencontra do deslocamento dele.
const CAMINHADA = [bonecoAndando1, bonecoAndando2, bonecoAndando3, bonecoAndando2];
const GUARDA_ANDANDO = [agente1, agente2, agente3, agente2];
const GUARDA_MULTANDO = [agente6, agente7];
const BASE_DO_SEMAFORO = 335;

const quadro = (ciclo, t, ms) => ciclo[Math.floor(t / ms) % ciclo.length];
const entre = (t, de, ate) => t >= de && t < ate;
const reduzirMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Relógio da cena: ms desde o início do passo, em laço. Com movimento
// reduzido não há animação contínua: a cena pula de legenda em legenda,
// parada no fim de cada uma, que é onde a regra já aconteceu.
function useRelogio(passo) {
  const [t, setT] = useState(() => (reduzirMovimento() ? passo.legendas[0][0] - 400 : 0));

  useEffect(() => {
    if (reduzirMovimento()) {
      let legenda = 0;
      const id = setInterval(() => {
        legenda = (legenda + 1) % passo.legendas.length;
        setT(passo.legendas[legenda][0] - 400);
      }, 4000);
      return () => clearInterval(id);
    }
    const inicio = performance.now();
    let id = requestAnimationFrame(function avancar(agora) {
      setT((agora - inicio) % passo.duracao);
      id = requestAnimationFrame(avancar);
    });
    return () => cancelAnimationFrame(id);
  }, [passo]);

  return t;
}

function Cena({ passo }) {
  const t = useRelogio(passo);
  const sinal = noTrecho(passo.sinal, t);
  const { valores: [bonecoX, bonecoPe], andando } = naTrajetoria(passo.boneco.pontos, t);
  const piscando = passo.boneco.piscando && entre(t, ...passo.boneco.piscando);
  const avisos = (passo.avisos ?? []).filter((aviso) => entre(t, aviso.de, aviso.ate));

  let guarda = null;
  if (passo.guarda) {
    const { valores: [x], andando: guardaAndando } = naTrajetoria(passo.guarda.pontos, t);
    const [inicioDaMulta, fimDaMulta] = passo.guarda.multando;
    guarda = {
      x,
      src: guardaAndando ? quadro(GUARDA_ANDANDO, t, 150) : entre(t, inicioDaMulta, fimDaMulta) ? quadro(GUARDA_MULTANDO, t, 400) : agente1,
      // O sprite olha para a direita: entra olhando para o carro e vira para ir embora.
      virado: t >= fimDaMulta,
    };
  }

  return (
    <div className="tut-tela">
      <div className="tut-palco">
        <div className="tut-cena" aria-hidden="true">
          <div className="segment calcada" style={{ top: 0, height: 100 }} />
          <div className="segment rua" style={{ top: 100, height: 100 }} />
          <div className={`segment rua ${passo.ciclovia ? 'com-ciclovia' : ''}`} style={{ top: 200, height: 100 }} />
          <div className="segment calcada" style={{ top: 300, height: 100 }} />
          <div className="crosswalk" style={{ top: 100, height: 200 }} />

          {passo.veiculos.map((veiculo, i) => {
            const { valores: [x] } = naTrajetoria(veiculo.pontos, t);
            return (
              <div key={i} className="tut-peca" style={{ left: x, top: veiculo.y, zIndex: 10 }}>
                <img src={CARROS[veiculo.cor]} alt="" className="car-image" style={{ width: 70 }} />
                {veiculo.buzina && entre(t, ...veiculo.buzina) && <span className="tut-buzina">Bi-bi!</span>}
              </div>
            );
          })}

          {passo.bicicleta && (
            <div className="tut-peca" style={{ left: naTrajetoria(passo.bicicleta.pontos, t).valores[0], top: passo.bicicleta.y, zIndex: 11 }}>
              <div className="ciclista" style={{ '--ciclista-quadro': '44px' }} />
            </div>
          )}

          <div className="tut-semaforo" style={{ top: BASE_DO_SEMAFORO - ALTURA_DO_SEMAFORO }}>
            <TrafficLight currentLight={sinal} />
          </div>

          {guarda && (
            <img
              src={guarda.src}
              alt=""
              className="tut-guarda"
              style={{ left: guarda.x, top: passo.guarda.pe, transform: `translate(-50%, -100%) scaleX(${guarda.virado ? -1 : 1})` }}
            />
          )}

          <img
            src={andando ? quadro(CAMINHADA, t, 150) : bonecoParado}
            alt=""
            className="tut-boneco"
            style={{ left: bonecoX, top: bonecoPe, opacity: piscando && Math.floor(t / 140) % 2 ? 0.2 : 1 }}
          />

          {(passo.pontos ?? []).filter((ganho) => entre(t, ganho.de, ganho.ate)).map((ganho) => {
            const progresso = (t - ganho.de) / (ganho.ate - ganho.de);
            return (
              <span key={ganho.de} className="tut-ganho" style={{ left: ganho.x + 34, top: (ganho.y ?? 70) - 30 * progresso, opacity: 1 - progresso * progresso }}>
                {ganho.texto}
              </span>
            );
          })}
        </div>

        <div
          className={`signal-badge ${sinal === 'red' ? 'state-go' : sinal === 'yellow' ? 'state-caution' : 'state-wait'}`}
          aria-hidden="true"
        >
          <span className="signal-icon">
            {sinal === 'red' ? <CheckIcon size={16} /> : sinal === 'yellow' ? <WarningIcon size={15} /> : <HourglassIcon size={15} />}
          </span>
          {sinal === 'red' ? 'Atravesse' : 'Espere'}
        </div>

        {passo.vidas && (
          <div className="tut-vidas" aria-hidden="true">
            {[0, 1, 2].map((i) => <HeartIcon key={i} size={15} filled={i < noTrecho(passo.vidas, t)} />)}
          </div>
        )}

        {passo.botaoGuarda && entre(t, ...passo.botaoGuarda) && (
          <span className="tut-botao-guarda" aria-hidden="true">🚨 Chamar Guarda (+{BONUS_CHAMAR_GUARDA} Pts)</span>
        )}

        {avisos.map((aviso) => (
          <div key={aviso.texto} className={`feedback-banner feedback-banner--${aviso.gravidade}`} aria-hidden="true">
            {aviso.gravidade === 'grave' ? <GraveWarningIcon size={18} className="feedback-icon" /> : <WarningIcon size={15} className="feedback-icon" />}
            <span>{aviso.texto}</span>
          </div>
        ))}
      </div>

      {/* Fora do palco, como a legenda de um vídeo: por cima da cena ela
          cobria o boneco esperando na calçada, que é o que a cena mostra.
          É também o que o leitor de tela lê — o resto ilustra o que ela diz —
          e só muda de legenda em legenda, então não fala a cada quadro. */}
      <p className="tut-legenda" aria-live="polite">{noTrecho(passo.legendas, t)}</p>
    </div>
  );
}

// Tutorial do menu: um passo por mecânica, cada um com uma cena animada e
// legendas. "Jogar!" no último passo já começa a partida.
export default function TutorialModal({ onClose, onJogar }) {
  const [indice, setIndice] = useState(0);
  const passo = PASSOS[indice];
  const ultimo = indice === PASSOS.length - 1;
  const irPara = (novo) => setIndice(Math.min(Math.max(novo, 0), PASSOS.length - 1));

  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') onClose();
      else if (evento.key === 'ArrowRight') setIndice((i) => Math.min(i + 1, PASSOS.length - 1));
      else if (evento.key === 'ArrowLeft') setIndice((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content nit-tutorial"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-tutorial"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="nit-tutorial-topo">
          <h3 id="titulo-tutorial">
            <span className="nit-tutorial-contagem">Tutorial {indice + 1}/{PASSOS.length}</span>
            {passo.titulo}
          </h3>
          <button className="nit-tutorial-fechar" onClick={onClose} aria-label="Fechar tutorial">✕</button>
        </div>

        {/* A key reinicia o relógio da cena a cada passo. */}
        <Cena key={indice} passo={passo} />

        <div className="nit-tutorial-rodape">
          <button className="modal-btn nit-btn-secundario" onClick={() => irPara(indice - 1)} disabled={indice === 0}>
            Voltar
          </button>
          <div className="nit-tutorial-passos">
            {PASSOS.map((p, i) => (
              <button
                key={p.titulo}
                className={i === indice ? 'ativo' : ''}
                onClick={() => irPara(i)}
                aria-label={`Passo ${i + 1}: ${p.titulo}`}
                aria-current={i === indice ? 'step' : undefined}
              />
            ))}
          </div>
          {/* Keys diferentes: o "Jogar!" é outro botão, e o autoFocus leva o foco até ele. */}
          {ultimo ? (
            <button key="jogar" className="modal-btn" onClick={onJogar} autoFocus>Jogar!</button>
          ) : (
            <button key="proximo" className="modal-btn" onClick={() => irPara(indice + 1)} autoFocus>Próximo</button>
          )}
        </div>
      </div>
    </div>
  );
}
