import React, { useState, useEffect, useCallback, useRef } from 'react';
import TrafficLight from './components/TrafficLight';
import Vehicle from './components/Vehicle';
import Pedestrian from './components/Pedestrian';
import SidewalkDecoration from './components/SidewalkDecoration';
import AgenteAnimado from './components/AgenteAnimado';
import usePlayerMovement from './hooks/usePlayerMovement';
import useGuardSystem, { BONUS_CHAMAR_GUARDA } from './hooks/useGuardSystem';
import useResponsiveScale from './hooks/useResponsiveScale';
import MainMenu from './components/MainMenu';
import ComandosModal from './components/ComandosModal';
import ResumoInfracoes from './components/ResumoInfracoes';
import { INFRACOES_ZERADAS, totalDeInfracoes } from './infracoes';
import { StarIcon, HeartIcon, HourglassIcon, CheckIcon, WarningIcon, GraveWarningIcon, InfractionIcon, ArrowLeftIcon, ArrowRightIcon, TrophyIcon, RestartIcon, PauseIcon, PlayIcon, GamepadIcon, HomeIcon } from './components/HudIcons';
import { SEGMENT_HEIGHT, mod3, segmentType, CROSSWALK_WIDTH, estaNaCalcadaComMargem } from './gameGrid';
import { calcularDificuldade } from './difficulty';
import { sortearRuaQueFura } from './furarSinal';

const ARENA_HEIGHT = 400;
const PLAYER_SCREEN_BOTTOM = 60;
const BASE_TOP = ARENA_HEIGHT - PLAYER_SCREEN_BOTTOM - (SEGMENT_HEIGHT / 2);

const RENDER_BEHIND = 3;
const RENDER_AHEAD = 8;

const TL_HEIGHT = 96;
const TL_INSET = 8;

const CHAVE_RECORDE = 'travessiaSegura_recorde';

// O acesso ao localStorage pode LANÇAR (aba anônima restrita, iframe com
// sandbox, política corporativa) — não só devolver null. Como isto roda no
// primeiro render, sem o try/catch a exceção derruba a árvore inteira e o
// jogo nem abre. O recorde é um extra: se não der pra persistir, o jogo
// segue normalmente e o recorde vale só para a sessão.
function lerRecordeSalvo() {
  try {
    const salvo = Number(localStorage.getItem(CHAVE_RECORDE));
    return Number.isFinite(salvo) && salvo > 0 ? salvo : 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(valor) {
  try {
    localStorage.setItem(CHAVE_RECORDE, String(valor));
  } catch {
    // Sem persistência disponível — segue o jogo.
  }
}

function segmentTop(i, y) {
  return BASE_TOP - i * SEGMENT_HEIGHT + y;
}

// Linha do chão do jogador na tela. Ele fica fixo (a câmera é que anda), a
// 60px do rodapé da arena — mesmo valor usado no `bottom` do Pedestrian.
const PLAYER_BASE_Y = ARENA_HEIGHT - PLAYER_SCREEN_BOTTOM;

// Numa vista de cima, quem está mais abaixo na tela está mais perto de quem
// olha e deve aparecer na frente. Esta função converte a linha do chão de
// um elemento (Y na tela) num z-index, de forma que a sobreposição siga a
// profundidade em vez de uma camada fixa: o boneco passa por trás do poste
// quando está acima dele e por cima quando está abaixo, e o mesmo vale para
// os veículos. O +1000 só evita valores negativos nos segmentos distantes.
function camadaPorProfundidade(baseY) {
  return Math.round(baseY) + 1000;
}

// Veículos e decorações ficam deitados no meio da faixa, então a linha do
// chão deles é o centro do segmento.
function camadaDoSegmento(i, playerY) {
  return camadaPorProfundidade(segmentTop(i, playerY) + SEGMENT_HEIGHT / 2);
}

export default function GameArena() {
  const arenaRef = useRef(null);
  const playerElRef = useRef(null);
  const vehicleElsRef = useRef(new Map());
  const scale = useResponsiveScale(600, 400, { padding: 24, maxScale: 2.6 });

  const [lightState, setLightState] = useState('green');
  const [timeLeft, setTimeLeft] = useState(5);
  // Rua (índice do segmento) em que um carro está furando o sinal vermelho
  // neste fechamento, ou null. Vale só enquanto o sinal está vermelho: no
  // verde todos voltam a andar e a marca deixa de fazer sentido.
  const [ruaQueFura, setRuaQueFura] = useState(null);
  // Ordem, contada em ruas, da última vez que alguém furou — é o que garante
  // o intervalo mínimo entre duas furadas (ver furarSinal.js).
  const ultimaFuradaRef = useRef(-Infinity);
  // O semáforo roda em setTimeout (continua em segundo plano), mas o
  // jogador roda em requestAnimationFrame (congela quando a aba some). Sem
  // pausar, quem trocasse de aba no meio da rua voltava punido por um sinal
  // que abriu enquanto ele estava impedido de andar. A retomada é manual
  // pra ninguém voltar direto pra dentro do trânsito.
  const [pausado, setPausado] = useState(false);
  const [mostrarComandos, setMostrarComandos] = useState(false);
  const [mostrarResumoFinal, setMostrarResumoFinal] = useState(false);
  const [isTouchWalking, setIsTouchWalking] = useState(false);
  const [isTouchLeft, setIsTouchLeft] = useState(false);
  const [isTouchRight, setIsTouchRight] = useState(false);
  const ehDispositivoDeToque = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  const [vidas, setVidas] = useState(3);
  // aviso: infração pontual, some sozinha depois de alguns segundos.
  // infracoes: contagem por tipo, persiste a partida inteira — vira o
  // resumo mostrado no fim de jogo (reforço pedagógico: o jogador vê
  // quantas vezes e de que tipo errou, não só um aviso que passa rápido).
  const [aviso, setAviso] = useState(null); // { texto, gravidade: 'grave' | 'leve' } | null
  const [infracoes, setInfracoes] = useState(INFRACOES_ZERADAS);

  // useCallback com deps vazias (mesmo padrão do handleLoseLife abaixo):
  // só chamam setters estáveis, então uma identidade fixa é segura e evita
  // reexecutar à toa os efeitos/hooks que as usam.
  const registrarInfracao = useCallback((tipo) => {
    setInfracoes((prev) => ({ ...prev, [tipo]: prev[tipo] + 1 }));
  }, []);

  // 'grave' = custou vida (banner forte, mais tempo na tela); 'leve' = só
  // custou pontos (banner mais discreto, some mais rápido). O check
  // `atual.texto === texto` evita que o timeout de um aviso antigo apague
  // um aviso mais novo que já tenha tomado o lugar dele.
  const mostrarAviso = useCallback((texto, gravidade) => {
    setAviso({ texto, gravidade });
    const duracao = gravidade === 'grave' ? 2800 : 2200;
    setTimeout(() => {
      setAviso((atual) => (atual && atual.texto === texto ? null : atual));
    }, duracao);
  }, []);

  const [penalidade, setPenalidade] = useState(0);

  const [gameState, setGameState] = useState('menu');
  const [highScore, setHighScore] = useState(lerRecordeSalvo);
  
  const [hasWonOnce, setHasWonOnce] = useState(false);

  const [scoreBump, setScoreBump] = useState(false);
  const [lifeShake, setLifeShake] = useState(false);
  const prevScoreRef = useRef(0);
  const prevVidasRef = useRef(3);

  // Pontos da caminhada só são creditados ao chegar na calçada — não a cada
  // passo dentro da rua. creditedRawScore guarda o valor já "garantido";
  // ultimoTipoSegmentoRef detecta o instante exato da chegada (transição
  // rua -> calçada).
  const [creditedRawScore, setCreditedRawScore] = useState(0);
  const ultimoTipoSegmentoRef = useRef('calcada');

  // usePlayerMovement é declarado depois (precisa receber handleLoseLife),
  // então a função de respawn chega aqui por ref — mesmo padrão do
  // chamarGuardaRef mais abaixo.
  const respawnRef = useRef(null);

  const handleLoseLife = useCallback((motivo) => {
    registrarInfracao(motivo === 'carro' ? 'carro' : motivo === 'pontos' ? 'pontosZerados' : 'sinalEntrada');
    setVidas((vAtual) => {
      const novasVidas = vAtual - 1;

      if (novasVidas <= 0) {
        setGameState('gameover');
        setAviso(null);
        return 0;
      }

      if (motivo === 'carro') {
        mostrarAviso('Você foi atingido! Olhe para os dois lados.', 'grave');
      } else if (motivo === 'pontos') {
        mostrarAviso('Sem pontos pra perder — isso custou uma vida!', 'grave');
      } else {
        mostrarAviso('Cuidado! Os carros ainda estão passando!', 'grave');
      }
      return novasVidas;
    });
    // Volta pra calçada e pisca: qualquer perda de vida devolve o jogador
    // pro início do ciclo, com uma janela em que ele não pode ser atingido
    // de novo (senão perderia várias vidas encostado no mesmo carro).
    respawnRef.current?.();
  }, [registrarInfracao, mostrarAviso]);

  const { position, isWalking, isRespawning, resetPosition, respawnNaCalcada } = usePlayerMovement(
    isTouchWalking,
    lightState,
    handleLoseLife,
    gameState !== 'playing' || pausado,
    playerElRef,
    vehicleElsRef,
    scale,
    isTouchLeft,
    isTouchRight
  );
  respawnRef.current = respawnNaCalcada;

  const playerX = position.x;
  const playerY = position.y;

  const playerYRef = useRef(playerY);
  playerYRef.current = playerY;

  const currentIndex = Math.floor(playerY / SEGMENT_HEIGHT);

  const { guardasAtivos, guardasAtivosRef, pistaValidaProxima, faixasComCarroParado, chamarGuarda, liberarGuarda, resetGuardas } =
    useGuardSystem({ arenaRef, vehicleElsRef, lightState, gameState, currentIndex, ruaQueFura, onPenalidade: setPenalidade });

  // Acompanha, ao longo de toda a travessia atual (desde que saiu da última
  // calçada), se o jogador já pisou fora da faixa em algum momento na rua —
  // mas só conta como infração se, NAQUELE instante, não havia carro parado
  // bloqueando a faixa: se o desvio foi forçado por um carro irregular ali,
  // o jogador não pode ser punido por não ter alternativa segura. "Gruda"
  // em true até a próxima chegada numa calçada — não importa se ele volta
  // pra dentro da faixa depois, a travessia já deixou de ser "só pela faixa".
  const saiuDaFaixaRef = useRef(false);
  if (
    segmentType(Math.floor(playerY / SEGMENT_HEIGHT)) === 'rua' &&
    Math.abs(playerX - 300) > CROSSWALK_WIDTH / 2 &&
    faixasComCarroParado.length === 0
  ) {
    saiuDaFaixaRef.current = true;
  }

  const creditedRawScoreRef = useRef(creditedRawScore);
  creditedRawScoreRef.current = creditedRawScore;

  const score = Math.max(0, creditedRawScore - penalidade);
  // Atribuição direta durante o render (mesmo padrão do playerYRef acima):
  // garante que o efeito do semáforo sempre leia o score do frame mais
  // recente, sem o atraso de um useEffect assíncrono.
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const totalInfracoes = totalDeInfracoes(infracoes);

  // Pausa assim que a aba deixa de estar visível. Não despausa sozinho: o
  // jogador retoma quando estiver pronto.
  useEffect(() => {
    const aoTrocarVisibilidade = () => {
      if (document.hidden) setPausado(true);
    };
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
  }, []);

  // Progressão de dificuldade: conforme a pontuação sobe, o sinal fecha
  // mais cedo e os carros passam mais rápido (com teto, nunca impossível).
  const dificuldade = calcularDificuldade(score);
  const dificuldadeRef = useRef(dificuldade);
  dificuldadeRef.current = dificuldade;

  // Atalhos de teclado: E chama o guarda, Esc abre/fecha a pausa. Tudo por
  // ref porque estas funções mudam de identidade a cada render e não
  // queremos reanexar o listener toda hora.
  const atalhosRef = useRef(null);
  atalhosRef.current = { chamarGuarda, pausado, mostrarComandos, gameState };
  useEffect(() => {
    const handleKeyDown = (e) => {
      const atual = atalhosRef.current;
      const tecla = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (atual.gameState !== 'playing') return;
        // Esc fecha primeiro os comandos (se abertos por cima da pausa),
        // depois alterna a própria pausa.
        if (atual.mostrarComandos) setMostrarComandos(false);
        else setPausado((p) => !p);
        return;
      }

      // Com o jogo pausado nenhum comando de jogo responde.
      if (atual.pausado || atual.gameState !== 'playing') return;

      if (tecla === 'e') atual.chamarGuarda();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Credita os pontos da caminhada só no instante em que o jogador chega
  // numa calçada nova — enquanto ele está atravessando a rua, os pontos
  // ficam "represados" e não aparecem no placar.
  useEffect(() => {
    if (gameState !== 'playing') return;

    const tipoAtual = segmentType(currentIndex);
    const chegouNaCalcada = tipoAtual === 'calcada' && ultimoTipoSegmentoRef.current !== 'calcada';

    if (chegouNaCalcada) {
      const rawScoreNaChegada = Math.floor(playerY / 50);
      const delta = rawScoreNaChegada - creditedRawScoreRef.current;

      if (delta > 0) {
        const foraDaFaixa = saiuDaFaixaRef.current;
        const pontosGanhos = foraDaFaixa ? Math.round(delta * 0.5) : delta;
        setCreditedRawScore((prev) => prev + pontosGanhos);

        if (foraDaFaixa) {
          registrarInfracao('faixa');
          mostrarAviso('Fora da faixa de pedestres! Pontos pela metade.', 'leve');
        }
      }

      saiuDaFaixaRef.current = false;
    }

    ultimoTipoSegmentoRef.current = tipoAtual;
  }, [currentIndex, gameState, playerY, registrarInfracao, mostrarAviso]);

  useEffect(() => {
    if (score > prevScoreRef.current) {
      setScoreBump(true);
      const t = setTimeout(() => setScoreBump(false), 350);
      prevScoreRef.current = score;
      return () => clearTimeout(t);
    }
    prevScoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (vidas < prevVidasRef.current) {
      setLifeShake(true);
      const t = setTimeout(() => setLifeShake(false), 400);
      prevVidasRef.current = vidas;
      return () => clearTimeout(t);
    }
    prevVidasRef.current = vidas;
  }, [vidas]);

  useEffect(() => {
    if (score >= 200 && gameState === 'playing' && !hasWonOnce) {
      setGameState('cutscene'); 
      setLightState('red'); 
      
      setTimeout(() => {
        setGameState('won'); 
      }, 2500); 
    }
  }, [score, gameState, hasWonOnce]);

  useEffect(() => {
    if (gameState === 'gameover' || gameState === 'won') {
      setHighScore((prev) => {
        const novoRecorde = Math.max(prev, score);
        if (novoRecorde > prev) {
          salvarRecorde(novoRecorde);
        }
        return novoRecorde;
      });
    }
  }, [gameState, score]);

  const restartGame = () => {
    setVidas(3);
    setPenalidade(0);
    setCreditedRawScore(0);
    setInfracoes(INFRACOES_ZERADAS);
    setPausado(false);
    setMostrarResumoFinal(false);
    ultimoTipoSegmentoRef.current = 'calcada';
    saiuDaFaixaRef.current = false;
    resetPosition();
    setLightState('green');
    setTimeLeft(5);
    setRuaQueFura(null);
    ultimaFuradaRef.current = -Infinity;
    setGameState('playing');
    setHasWonOnce(false);
    resetGuardas();
  };

  const continuePlaying = () => {
    setHasWonOnce(true); 
    setGameState('playing'); 
  };

  const goToMenu = () => {
    setVidas(3);
    setPenalidade(0);
    setCreditedRawScore(0);
    setInfracoes(INFRACOES_ZERADAS);
    setPausado(false);
    setMostrarResumoFinal(false);
    ultimoTipoSegmentoRef.current = 'calcada';
    saiuDaFaixaRef.current = false;
    resetPosition();
    setLightState('green');
    setTimeLeft(5);
    setRuaQueFura(null);
    ultimaFuradaRef.current = -Infinity;
    setHasWonOnce(false);
    setGameState('menu');
    resetGuardas();
  };

  useEffect(() => {
    if (gameState !== 'playing' || pausado) return;

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      if (lightState === 'green') {
        setLightState('yellow');
        setTimeLeft(2);
      } else if (lightState === 'yellow') {
        setLightState('red');
        setTimeLeft(dificuldadeRef.current.duracaoVermelho);

        // O sinal fechou para os carros: sorteia se algum não vai respeitar.
        const furada = sortearRuaQueFura({
          indiceDoJogador: Math.floor(playerYRef.current / SEGMENT_HEIGHT),
          ultimaOrdem: ultimaFuradaRef.current,
          chance: dificuldadeRef.current.chanceDeFurarSinal,
        });
        if (furada) {
          ultimaFuradaRef.current = furada.ordem;
          setRuaQueFura(furada.rua);
        }
      } else if (lightState === 'red') {
        setLightState('green');
        setTimeLeft(dificuldadeRef.current.duracaoVerde);
        setRuaQueFura(null);

        const currentSegIndex = Math.floor(playerYRef.current / SEGMENT_HEIGHT);
        // Mesma margem usada em usePlayerMovement pra decidir "já está na
        // calçada" — não o limite bruto do segmento. Sem isso, dava pra
        // ser punido por "ainda estar na rua" mesmo já visualmente seguro
        // na calçada (a margem existe justamente pra compensar o tamanho
        // do sprite do jogador).
        const aindaNaRua = !estaNaCalcadaComMargem(playerYRef.current);

        if (aindaNaRua) {
          if (!guardasAtivosRef.current.includes(currentSegIndex)) {
            // Com 0 pontos não tem mais o que descontar: a partir daí, o
            // mesmo erro custa uma vida em vez de sumir sem efeito.
            if (scoreRef.current <= 0) {
              handleLoseLife('pontos');
            } else {
              setPenalidade((p) => p + 10);
              registrarInfracao('sinalAberto');
              mostrarAviso('O sinal abriu com você na rua! -10 pontos.', 'leve');
            }
          }
        }
      }
    }
  }, [timeLeft, lightState, gameState, pausado, guardasAtivosRef, handleLoseLife, registrarInfracao, mostrarAviso]);

  const handleTouchStart = (e) => {
    if (e && e.button !== undefined && e.button !== 0) return;
    setIsTouchWalking(true);
  };
  const handleTouchStop = () => setIsTouchWalking(false);

  const visible = [];
  for (let i = currentIndex - RENDER_BEHIND; i <= currentIndex + RENDER_AHEAD; i++) {
    visible.push(i);
  }

  return (
    <div
      className={`game-arena ${pausado ? 'pausado' : ''}`}
      ref={arenaRef}
      style={{
        // `zoom` e não `transform: scale()`: o transform borra a pixel art em
        // escalas fracionárias e ignora o image-rendering (ver .game-arena no
        // App.css). O zoom escala o layout, então cada sprite é rasterizado
        // já no tamanho final.
        zoom: scale,
      }}
      onPointerDown={handleTouchStart}
      onPointerUp={handleTouchStop}
      onPointerLeave={handleTouchStop}
    >
      {gameState === 'menu' && (
        <MainMenu onStartGame={() => {
          setGameState('playing');
          restartGame();
        }} />
      )}
      
      <div className="hud-container">
        <div className={`scoreboard ${scoreBump ? 'bump' : ''}`}>
          <StarIcon size={17} /> Pontos: {score}
        </div>
        <div className="lives-board" style={{ transform: lifeShake ? 'translateX(5px)' : 'none' }}>
          {[0, 1, 2].map((i) => (
            <HeartIcon key={i} size={17} filled={i < vidas} />
          ))}
        </div>
        {gameState === 'playing' && (
          <div className="infracoes-board" title="Infrações cometidas nesta partida">
            <InfractionIcon size={15} /> {totalInfracoes}
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <div
          className={`signal-badge ${
            lightState === 'red' ? 'state-go' : lightState === 'yellow' ? 'state-caution' : 'state-wait'
          } ${timeLeft <= 2 ? 'urgent' : ''}`}
          // O contador muda a cada segundo; se o leitor de tela seguisse
          // este elemento, falaria sem parar. Quem anuncia é a região viva
          // abaixo, que só muda quando o sinal muda.
          aria-hidden="true"
        >
          <span className="signal-icon">
            {lightState === 'red' ? (
              <CheckIcon size={18} />
            ) : lightState === 'yellow' ? (
              <WarningIcon size={17} />
            ) : (
              <HourglassIcon size={17} />
            )}
          </span>
          {lightState === 'red' ? 'Atravesse' : 'Espere'}: {timeLeft}s
        </div>
      )}

      {/* Estado do sinal para quem não enxerga a cor: o texto só muda na
          troca de sinal, então é falado uma vez por mudança. */}
      {gameState === 'playing' && (
        <p className="sr-only" role="status" aria-live="assertive">
          {lightState === 'red'
            ? 'Sinal aberto para pedestres. Pode atravessar.'
            : 'Sinal fechado para pedestres. Espere na calçada.'}
        </p>
      )}

      {/* --- BOTÃO DE CHAMAR GUARDA --- */}
      {gameState === 'playing' && lightState === 'red' && pistaValidaProxima !== undefined && (
        <button
          className="modal-btn" 
          onPointerDown={(e) => {
            e.stopPropagation();
            chamarGuarda();
          }}
          style={{
            position: 'absolute',
            bottom: '150px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: '#e67e22',
            fontSize: '14px',
            padding: '10px 20px',
            border: '2px solid white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            animation: 'pulse 1s infinite'
          }}
        >
          🚨 Chamar Guarda (+{BONUS_CHAMAR_GUARDA} Pts)
        </button>
      )}

      {/* --- CONTROLE LATERAL NO TOQUE (esquerda/direita) --- */}
      {ehDispositivoDeToque && gameState === 'playing' && (
        <>
          <button
            aria-label="Andar para a esquerda"
            onPointerDown={(e) => { e.stopPropagation(); setIsTouchLeft(true); }}
            onPointerUp={(e) => { e.stopPropagation(); setIsTouchLeft(false); }}
            onPointerLeave={(e) => { e.stopPropagation(); setIsTouchLeft(false); }}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              zIndex: 100,
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.7)',
              background: 'rgba(30,60,114,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer',
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <ArrowLeftIcon size={28} />
          </button>
          <button
            aria-label="Andar para a direita"
            onPointerDown={(e) => { e.stopPropagation(); setIsTouchRight(true); }}
            onPointerUp={(e) => { e.stopPropagation(); setIsTouchRight(false); }}
            onPointerLeave={(e) => { e.stopPropagation(); setIsTouchRight(false); }}
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              zIndex: 100,
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.7)',
              background: 'rgba(30,60,114,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              cursor: 'pointer',
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            <ArrowRightIcon size={28} />
          </button>
        </>
      )}

      {aviso && (
        <div className={`feedback-banner feedback-banner--${aviso.gravidade}`}>
          {aviso.gravidade === 'grave' ? (
            <GraveWarningIcon size={20} className="feedback-icon" />
          ) : (
            <WarningIcon size={16} className="feedback-icon" />
          )}
          <span>{aviso.texto}</span>
        </div>
      )}

      {pausado && gameState === 'playing' && (
        <div className="modal-overlay" style={{ zIndex: 110 }} onPointerDown={(e) => e.stopPropagation()}>
          <div className="modal-content nit-pausa" role="dialog" aria-modal="true" aria-labelledby="titulo-pausa">
            <div className="nit-pausa-icone" aria-hidden="true"><PauseIcon size={22} /></div>
            <h3 id="titulo-pausa">Jogo pausado</h3>

            <div className="nit-stats-row">
              <div className="nit-stat-card">
                <StarIcon size={18} />
                <span className="nit-stat-valor">{score}</span>
                <span className="nit-stat-label">Pontos</span>
              </div>
              <div className="nit-stat-card nit-stat-card--recorde">
                <div className="nit-pausa-vidas">
                  {[0, 1, 2].map((i) => (
                    <HeartIcon key={i} size={16} filled={i < vidas} />
                  ))}
                </div>
                <span className="nit-stat-label">Vidas</span>
              </div>
            </div>

            <div className="nit-pausa-botoes">
              <button className="modal-btn nit-btn-com-icone" onClick={() => setPausado(false)} autoFocus>
                <PlayIcon size={14} /> Continuar
              </button>
              <button className="modal-btn nit-btn-secundario nit-btn-com-icone" onClick={() => setMostrarComandos(true)}>
                <GamepadIcon size={15} /> Comandos
              </button>
              <button className="modal-btn nit-btn-secundario nit-btn-com-icone" onClick={goToMenu}>
                <HomeIcon size={15} /> Sair para o menu
              </button>
            </div>

            <p className="nit-pausa-dica">
              <span className="nit-tecla nit-tecla--larga">Esc</span> volta ao jogo
            </p>
          </div>
        </div>
      )}

      {mostrarComandos && gameState === 'playing' && (
        <ComandosModal onClose={() => setMostrarComandos(false)} zIndex={120} />
      )}

      {gameState === 'gameover' && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div
            className={`modal-content error nit-gameover ${totalInfracoes > 0 ? 'nit-gameover--com-resumo' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-fim-de-jogo"
          >
            <div className="nit-gameover-col">
              <div className="nit-gameover-icone" aria-hidden="true"><GraveWarningIcon size={28} color="#e74c3c" /></div>
              <h3 id="titulo-fim-de-jogo">Fim de Jogo!</h3>
              <p>Você não conseguiu atravessar com segurança.</p>

              <div className="nit-stats-row">
                <div className="nit-stat-card">
                  <StarIcon size={18} />
                  <span className="nit-stat-valor">{score}</span>
                  <span className="nit-stat-label">Pontuação</span>
                </div>
                <div className="nit-stat-card nit-stat-card--recorde">
                  <TrophyIcon size={18} />
                  <span className="nit-stat-valor">{highScore}</span>
                  <span className="nit-stat-label">Recorde</span>
                </div>
              </div>

              <button className="modal-btn nit-btn-com-icone" onClick={restartGame} autoFocus>
                <RestartIcon size={15} /> Tentar Novamente
              </button>
            </div>

            {totalInfracoes > 0 && (
              <ResumoInfracoes infracoes={infracoes} className="nit-gameover-col" />
            )}
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="victory-screen" style={{ zIndex: 100 }}>
          {/* O relatório só entra quando o jogador decide encerrar: quem
              escolhe continuar ainda está no meio da mesma partida, e as
              infrações seguem sendo contadas. */}
          {mostrarResumoFinal ? (
            <div className="victory-panel victory-panel--resumo">
              <h1>Missão cumprida!</h1>
              <p className="nit-resumo-placar">
                <StarIcon size={16} /> {score} pontos
              </p>
              <ResumoInfracoes infracoes={infracoes} />
              <button className="modal-btn nit-btn-com-icone" onClick={goToMenu}>
                <HomeIcon size={15} color="#ffffff" /> Voltar ao menu
              </button>
            </div>
          ) : (
            <div className="victory-panel">
              <h1>Você Chegou à Praia!</h1>
              <p>Parabéns por realizar a travessia com segurança!</p>
              <h2 style={{ color: 'white', marginBottom: '25px' }}>Pontuação: {score}</h2>

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button className="modal-btn" onClick={continuePlaying}>
                  CONTINUAR JOGANDO
                </button>
                <button className="modal-btn nit-btn-perigo" onClick={() => setMostrarResumoFinal(true)}>
                  ENCERRAR
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`scene ${gameState === 'cutscene' || gameState === 'won' ? 'is-cutscene' : ''}`}>
        {visible.map((i) => {
          const type = segmentType(i);
          return (
            <div
              key={`bg-${i}`}
              className={`segment ${type}`}
              style={{ 
                position: 'absolute',
                width: '100%',
                top: 0,
                height: `${SEGMENT_HEIGHT}px`,
                transform: `translateY(${segmentTop(i, playerY)}px)`,
                willChange: 'transform',
                zIndex: 1
              }}
            />
          );
        })}

        {/* Decorações ficam FORA do .segment: dentro dele herdariam o
            z-index 1 do fundo (o segmento cria contexto de empilhamento) e
            nunca poderiam aparecer na frente do jogador. */}
        {visible
          .filter((i) => segmentType(i) === 'calcada')
          .map((i) => (
            <div
              key={`deco-${i}`}
              data-calcada-index={i}
              style={{
                position: 'absolute',
                width: '100%',
                top: 0,
                height: `${SEGMENT_HEIGHT}px`,
                transform: `translateY(${segmentTop(i, playerY)}px)`,
                willChange: 'transform',
                zIndex: camadaDoSegmento(i, playerY),
                pointerEvents: 'none'
              }}
            >
              <SidewalkDecoration indice={i} />
            </div>
          ))}

        {visible
          .filter((i) => mod3(i) === 2) 
          .map((i) => (
            <div
              key={`crosswalk-${i}`}
              className="crosswalk"
              data-crosswalk-index={i}
              style={{
                top: 0,
                // O transform inline substitui por completo o `transform:
                // translateX(-50%)` da classe .crosswalk (CSS não combina
                // as duas declarações) — sem repetir o translateX(-50%)
                // aqui, a faixa perde a centralização e fica deslocada
                // pra direita.
                transform: `translateX(-50%) translateY(${segmentTop(i, playerY)}px)`,
                height: `${SEGMENT_HEIGHT * 2}px`,
                willChange: 'transform',
                zIndex: 5
              }}
            />
          ))}

        {visible
          .filter((i) => segmentType(i) === 'rua') 
          .map((i) => {
            const isViaInterditada = guardasAtivos.includes(i);

            return (
              <React.Fragment key={`rua-group-${i}`}>
                
                {isViaInterditada && (
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    top: 0,
                    height: `${SEGMENT_HEIGHT}px`,
                    transform: `translateY(${segmentTop(i, playerY)}px)`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 40px',
                    zIndex: camadaDoSegmento(i, playerY),
                    fontSize: '28px',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.5))' }}>🚧</span>
                    <span style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.5))' }}>🚧</span>
                  </div>
                )}

                <div
                  className="car-container" 
                  data-lane-index={i} 
                  style={{ 
                    position: 'absolute',
                    width: '100%',
                    top: 0,
                    height: `${SEGMENT_HEIGHT}px`,
                    transform: `translateY(${segmentTop(i, playerY)}px)`,
                    willChange: 'transform',
                    zIndex: camadaDoSegmento(i, playerY),
                    pointerEvents: 'none'
                  }}
                >
                  <Vehicle
                    // Ordem das condições: a via interditada pelo guarda para
                    // qualquer carro, inclusive o que ia furar o sinal. Só
                    // depois disso a rua sorteada segue andando no vermelho.
                    lightState={isViaInterditada ? 'red' : i === ruaQueFura ? 'green' : lightState}
                    seed={i}
                    duracaoCarro={dificuldade.duracaoCarro}
                    registerRef={(el) => {
                      if (el) vehicleElsRef.current.set(i, el);
                      else vehicleElsRef.current.delete(i);
                    }}
                  />
                </div>
                
                {isViaInterditada && (
                  <div
                    style={{ 
                      position: 'absolute',
                      width: '100%',
                      top: 0,
                      height: `${SEGMENT_HEIGHT}px`,
                      transform: `translateY(${segmentTop(i, playerY)}px)`,
                      // O guarda fica de pé perto da base da faixa, não
                      // deitado no meio dela como os carros.
                      zIndex: camadaPorProfundidade(segmentTop(i, playerY) + SEGMENT_HEIGHT - 10),
                      pointerEvents: 'none'
                    }}
                  >
                    <AgenteAnimado
                      onComplete={() => liberarGuarda(i)}
                      laneIndex={i}
                      vehicleElsRef={vehicleElsRef}
                      arenaRef={arenaRef}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}

        {visible
          .filter((i) => mod3(i) === 0) 
          .map((i) => {
            const translateY = segmentTop(i, playerY) + SEGMENT_HEIGHT - TL_HEIGHT - TL_INSET;
            // A base do poste (onde ele encosta no chão) é o que define a
            // profundidade — não o topo, que fica bem mais alto na tela.
            const baseDoPosteY = translateY + 120;

            return (
              <div
                key={`signal-container-${i}`}
                className="traffic-light-container"
                style={{
                  top: 0,
                  transform: `translateY(${translateY}px)`,
                  right: '12px',
                  zIndex: camadaPorProfundidade(baseDoPosteY),
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '60px'
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <TrafficLight currentLight={lightState} />
              </div>
            );
          })}

        <Pedestrian
          isWalking={gameState === 'cutscene' ? true : isWalking}
          isRespawning={isRespawning}
          x={playerX}
          y={PLAYER_SCREEN_BOTTOM - 20}
          zIndex={camadaPorProfundidade(PLAYER_BASE_Y)}
          registerRef={(el) => { playerElRef.current = el; }}
        />
      </div>
    </div>
  );
}