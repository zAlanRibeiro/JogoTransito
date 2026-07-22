import React, { useState, useEffect, useCallback, useRef } from 'react';
import TrafficLight from './components/TrafficLight';
import Vehicle from './components/Vehicle';
import Pedestrian from './components/Pedestrian';
import SidewalkDecoration from './components/SidewalkDecoration';
import usePlayerMovement from './hooks/usePlayerMovement';

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

export default function GameArena() {
  const [lightState, setLightState] = useState('green');
  const [timeLeft, setTimeLeft] = useState(5);
  const [isTouchWalking, setIsTouchWalking] = useState(false);
  const [vidas, setVidas] = useState(3);
  const [mensagemErro, setMensagemErro] = useState('');
  
  // Apenas penalidade em pontos, sem mexer nas vidas
  const [penalidade, setPenalidade] = useState(0);

  const [gameState, setGameState] = useState('playing'); 
  const [highScore, setHighScore] = useState(0);

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
    gameState === 'gameover', 
    { minY: 0 }
  );

  const playerX = position.x;
  const playerY = position.y;

  const playerYRef = useRef(playerY);
  playerYRef.current = playerY;

  const rawScore = Math.floor(playerY / 50);
  const score = Math.max(0, rawScore - penalidade);

  const currentIndex = Math.floor(playerY / SEGMENT_HEIGHT);

  useEffect(() => {
    if (gameState === 'gameover') {
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

        // Se o sinal abriu e o player está na rua, gera apenas pontos negativos (sem tirar vida)
        if (currentSegType === 'rua') {
          setPenalidade((p) => p + 10);
          setMensagemErro('⚠️ O sinal abriu com você na rua! -10 pontos.');
          setTimeout(() => setMensagemErro(''), 2500);
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
      onPointerDown={handleTouchStart}
      onPointerUp={handleTouchStop}
      onPointerLeave={handleTouchStop}
    >
      <div className="hud-container">
        <div className="scoreboard">⭐ Pontos: {score}</div>
        <div className="lives-board">❤️ Vidas: {vidas}</div>
      </div>

      {mensagemErro && <div className="feedback-banner">{mensagemErro}</div>}

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

      <div className="scene">
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
          .map((i) => (
            <div
              key={`car-container-${i}`}
              style={{ 
                position: 'absolute',
                width: '100%',
                top: 0,
                height: `${SEGMENT_HEIGHT}px`,
                transform: `translateY(${segmentTop(i, playerY)}px)`,
                willChange: 'transform',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            >
              <Vehicle lightState={lightState} seed={i} />
            </div>
          ))}

        {visible
          .filter((i) => mod3(i) === 0) 
          .map((i) => (
            <div
              key={`signal-${i}`}
              className="traffic-light-container"
              style={{
                top: 0,
                transform: `translateY(${segmentTop(i, playerY) + SEGMENT_HEIGHT - TL_HEIGHT - TL_INSET}px)`,
                right: '12px',
                zIndex: 15,
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '60px'
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <TrafficLight 
                currentLight={lightState} 
                timeLeft={timeLeft} 
              />
            </div>
          ))}

        <Pedestrian isWalking={isWalking} x={playerX} y={PLAYER_SCREEN_BOTTOM - 20} />
      </div>
    </div>
  );
}