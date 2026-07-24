import React, { useState, useEffect, useCallback, useRef } from 'react';
import TrafficLight from './components/TrafficLight';
import Vehicle from './components/Vehicle';
import Pedestrian from './components/Pedestrian';
import SidewalkDecoration from './components/SidewalkDecoration';
import usePlayerMovement from './hooks/usePlayerMovement';
import MainMenu from './components/MainMenu';
import { StarIcon, HeartIcon, HourglassIcon, CheckIcon, WarningIcon } from './components/HudIcons';

const SEGMENT_HEIGHT = 100;
const ARENA_HEIGHT = 400;
const PLAYER_SCREEN_BOTTOM = 60;
const PATTERN = ['calcada', 'rua', 'rua']; 
const BASE_TOP = ARENA_HEIGHT - PLAYER_SCREEN_BOTTOM - (SEGMENT_HEIGHT / 2);

const RENDER_BEHIND = 3;
const RENDER_AHEAD = 8; 

const TL_HEIGHT = 96;
const TL_INSET = 8;

function mod3(i) {
  return ((i % 3) + 3) % 3;
}

function segmentType(i) {
  return PATTERN[mod3(i)];
}

function segmentTop(i, y) {
  return BASE_TOP - i * SEGMENT_HEIGHT + y;
}

// --- COMPONENTE: ANIMAÇÃO DO GUARDA ---
const AgenteAnimado = ({ onComplete }) => {
  const [fase, setFase] = useState('entrando'); 
  const [frame, setFrame] = useState(1);
  const [posicaoX, setPosicaoX] = useState(-50); 

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let interval;
    let timeout; 

    if (fase === 'entrando') {
      interval = setInterval(() => {
        setFrame((f) => (f >= 4 ? 1 : f + 1)); 
        
        setPosicaoX((x) => {
          if (x >= 100) { 
            setFase('multando');
            setFrame(6); 
            return x;
          }
          return x + 15; 
        });
      }, 150); 
      
    } else if (fase === 'multando') {
      interval = setInterval(() => {
        setFrame((f) => (f === 6 ? 7 : 6)); 
      }, 250); 

      timeout = setTimeout(() => {
        setFase('saindo');
        setFrame(1); 
      }, 10000);
      
    } else if (fase === 'saindo') {
      interval = setInterval(() => {
        setFrame((f) => (f >= 4 ? 1 : f + 1)); 
        
        setPosicaoX((x) => {
          if (x <= -60) { 
            if (onCompleteRef.current) {
              onCompleteRef.current(); 
            }
            return x;
          }
          return x - 15; 
        });
      }, 150); 
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [fase]); 

  return (
    <img
      src={`/agente_${frame}.png`}
      alt="Agente Multando"
      style={{
        position: 'absolute',
        left: `${posicaoX}px`,
        bottom: '10px', 
        height: '125px', 
        zIndex: 85, 
        transition: 'left 0.15s linear',
        filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.4))',
        transform: fase === 'saindo' ? 'scaleX(-1)' : 'none' 
      }}
    />
  );
};

export default function GameArena() {
  const arenaRef = useRef(null); 
  
  const [lightState, setLightState] = useState('green');
  const [timeLeft, setTimeLeft] = useState(5);
  const [isTouchWalking, setIsTouchWalking] = useState(false);
  const [vidas, setVidas] = useState(3);
  const [mensagemErro, setMensagemErro] = useState('');
  
  const [penalidade, setPenalidade] = useState(0);

  const [gameState, setGameState] = useState('menu');
  const [highScore, setHighScore] = useState(0);
  
  const [hasWonOnce, setHasWonOnce] = useState(false); 

  const [agentesChamados, setAgentesChamados] = useState([]);
  const [guardasAtivos, setGuardasAtivos] = useState([]); 
  const guardasAtivosRef = useRef([]); 
  
  const [faixasComCarroParado, setFaixasComCarroParado] = useState([]); 

  const [scoreBump, setScoreBump] = useState(false);
  const [lifeShake, setLifeShake] = useState(false);
  const prevScoreRef = useRef(0);
  const prevVidasRef = useRef(3);

  useEffect(() => {
    guardasAtivosRef.current = guardasAtivos;
  }, [guardasAtivos]);

  const handleLoseLife = useCallback((motivo) => {
    setVidas((vAtual) => {
      const novasVidas = vAtual - 1;
      
      if (novasVidas <= 0) {
        setGameState('gameover');
        setMensagemErro(''); 
        return 0;
      }
      
      if (motivo === 'carro') {
        setMensagemErro('Você foi atingido! Olhe para os dois lados.');
      } else {
        setMensagemErro('Cuidado! Sinal verde para os carros!');
      }
      return novasVidas;
    });
    setTimeout(() => setMensagemErro(''), 2500);
  }, []);

  const { position, isWalking, resetPosition } = usePlayerMovement(
    isTouchWalking,
    lightState,
    handleLoseLife,
    gameState !== 'playing',
    { minY: 0 }
  );

  const playerX = position.x;
  const playerY = position.y;

  const playerYRef = useRef(playerY);
  playerYRef.current = playerY;

  const rawScore = Math.floor(playerY / 50);
  const score = Math.max(0, rawScore - penalidade);

  const currentIndex = Math.floor(playerY / SEGMENT_HEIGHT);

  // ========================================================
  // RADAR AMPLIADO (COBRE A FAIXA INTEIRA)
  // ========================================================
  useEffect(() => {
    if (lightState === 'red' && gameState === 'playing') {
      const scanner = setInterval(() => {
        if (!arenaRef.current) return;
        
        const arenaRect = arenaRef.current.getBoundingClientRect();
        const centroDaTela = arenaRect.left + (arenaRect.width / 2);
        
        const containers = document.querySelectorAll('.car-container');
        const novasFaixasComCarro = [];

        containers.forEach(container => {
          const laneIndex = parseInt(container.getAttribute('data-lane-index'), 10);
          const elementosInternos = container.querySelectorAll('*');
          let carroParadoNestaPista = false;

          elementosInternos.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 20 && rect.width < 250) {
              // 👈 Margem alargada (-50px a +50px do centro) para abranger o carro inteiro ou a traseira/frente na faixa
              if (rect.left < centroDaTela + 50 && rect.right > centroDaTela - 50) {
                carroParadoNestaPista = true;
              }
            }
          });

          if (carroParadoNestaPista) {
            novasFaixasComCarro.push(laneIndex);
          }
        });

        setFaixasComCarroParado(novasFaixasComCarro);
      }, 300);

      return () => clearInterval(scanner);
    } else {
      setFaixasComCarroParado([]); 
    }
  }, [lightState, gameState]);

  const pistaValidaProxima = faixasComCarroParado.find(
    (lane) => Math.abs(currentIndex - lane) <= 1 && 
              !agentesChamados.includes(lane) && 
              !guardasAtivos.includes(lane)
  );

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
      setHighScore((prev) => Math.max(prev, score));
    }
  }, [gameState, score]);

  const restartGame = () => {
    setVidas(3);
    setPenalidade(0);
    resetPosition();
    setLightState('green');
    setTimeLeft(5);
    setGameState('playing');
    setHasWonOnce(false); 
    setAgentesChamados([]); 
    setGuardasAtivos([]);
    setFaixasComCarroParado([]);
  };

  const continuePlaying = () => {
    setHasWonOnce(true); 
    setGameState('playing'); 
  };

  const goToMenu = () => {
    setVidas(3);
    setPenalidade(0);
    resetPosition();
    setLightState('green');
    setTimeLeft(5);
    setHasWonOnce(false);
    setGameState('menu'); 
    setAgentesChamados([]);
    setGuardasAtivos([]);
    setFaixasComCarroParado([]);
  };

  useEffect(() => {
    if (gameState !== 'playing') return; 
    
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      if (lightState === 'green') {
        setLightState('yellow');
        setTimeLeft(2); 
      } else if (lightState === 'yellow') {
        setLightState('red');
        setTimeLeft(5); 
      } else if (lightState === 'red') {
        setLightState('green');
        setTimeLeft(6); 

        const currentSegIndex = Math.floor(playerYRef.current / SEGMENT_HEIGHT);
        const currentSegType = segmentType(currentSegIndex);

        if (currentSegType === 'rua') {
          if (!guardasAtivosRef.current.includes(currentSegIndex)) {
            setPenalidade((p) => p + 10);
            setMensagemErro('O sinal abriu com você na rua! -10 pontos.');
            setTimeout(() => setMensagemErro(''), 2500);
          }
        }
      }
    }
  }, [timeLeft, lightState, gameState]);

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
      className="game-arena"
      ref={arenaRef} 
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
      </div>

      {gameState === 'playing' && (
        <div
          className={`signal-badge ${
            lightState === 'red' ? 'state-go' : lightState === 'yellow' ? 'state-caution' : 'state-wait'
          } ${timeLeft <= 2 ? 'urgent' : ''}`}
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

      {/* --- BOTÃO DE CHAMAR GUARDA --- */}
      {gameState === 'playing' && lightState === 'red' && pistaValidaProxima !== undefined && (
        <button
          className="modal-btn" 
          onPointerDown={(e) => {
            e.stopPropagation(); 
            setPenalidade((p) => p - 20); 
            setAgentesChamados((prev) => [...prev, pistaValidaProxima]); 
            setGuardasAtivos((prev) => [...prev, pistaValidaProxima]); 
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
          🚨 Chamar Guarda (+20 Pts)
        </button>
      )}

      {mensagemErro && (
        <div className="feedback-banner">
          <WarningIcon size={16} className="feedback-icon" /> {mensagemErro}
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content error">
            <h3>Fim de Jogo!</h3>
            <p style={{ margin: '10px 0' }}>Você não conseguiu atravessar com segurança.</p>
            <h2 style={{ color: '#2c3e50' }}>Pontuação: {score}</h2>
            <p style={{ color: '#7f8c8d', fontWeight: 'bold' }}>Recorde da Sessão: {highScore}</p>
            <button className="modal-btn" onClick={restartGame} style={{ marginTop: '15px' }}>
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="victory-screen" style={{ zIndex: 100 }}>
          <div className="victory-panel">
            <h1>Você Chegou à Praia!</h1>
            <p>Parabéns por realizar a travessia com segurança!</p>
            <h2 style={{ color: 'white', marginBottom: '25px' }}>Pontuação: {score}</h2>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button className="modal-btn" onClick={continuePlaying}>
                CONTINUAR JOGANDO
              </button>
              <button className="modal-btn" style={{ backgroundColor: '#e74c3c' }} onClick={goToMenu}>
                VOLTAR AO MENU
              </button>
            </div>
          </div>
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
            >
              {type === 'calcada' && (
                <SidewalkDecoration seed={i} />
              )}
            </div>
          );
        })}

        {visible
          .filter((i) => mod3(i) === 2) 
          .map((i) => (
            <div
              key={`crosswalk-${i}`}
              className="crosswalk"
              style={{ 
                top: 0,
                transform: `translateY(${segmentTop(i, playerY)}px)`, 
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
                    zIndex: 65,
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
                    zIndex: 60, 
                    pointerEvents: 'none'
                  }}
                >
                  <Vehicle lightState={isViaInterditada ? 'red' : lightState} seed={i} />
                </div>
                
                {isViaInterditada && (
                  <div
                    style={{ 
                      position: 'absolute',
                      width: '100%',
                      top: 0,
                      height: `${SEGMENT_HEIGHT}px`,
                      transform: `translateY(${segmentTop(i, playerY)}px)`,
                      zIndex: 85, 
                      pointerEvents: 'none'
                    }}
                  >
                    <AgenteAnimado onComplete={() => {
                      setGuardasAtivos((prev) => prev.filter((id) => id !== i));
                    }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}

        {visible
          .filter((i) => mod3(i) === 0) 
          .map((i) => {
            const translateY = segmentTop(i, playerY) + SEGMENT_HEIGHT - TL_HEIGHT - TL_INSET;
            const baseDoPosteY = translateY + 120;
            const dynamicZIndex = baseDoPosteY > 360 ? 85 : 70;

            return (
              <div
                key={`signal-container-${i}`}
                className="traffic-light-container"
                style={{
                  top: 0,
                  transform: `translateY(${translateY}px)`,
                  right: '12px',
                  zIndex: dynamicZIndex, 
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
          x={playerX} 
          y={PLAYER_SCREEN_BOTTOM - 20} 
        />
      </div>
    </div>
  );
}