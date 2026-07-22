import { useState, useEffect, useCallback, useRef } from 'react';

export default function usePlayerMovement(isTouchWalking, lightState, onLoseLife, isGameOver, bounds = {}) {
  const { minY = 0, maxY = Infinity } = bounds;
  const posRef = useRef({ x: 300, y: 0 });
  const [position, setPosition] = useState(posRef.current);
  const [isWalking, setIsWalking] = useState(false);
  const lastMistakeTime = useRef(0);

  const resetPosition = useCallback(() => {
    posRef.current = { ...posRef.current, y: 0 };
    setPosition(posRef.current);
  }, []);

  useEffect(() => {
    const keys = { w: false, a: false, s: false, d: false };
    let animationFrame;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (keys.hasOwnProperty(key)) keys[key] = true;
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (keys.hasOwnProperty(key)) keys[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const loop = () => {
      if (isGameOver) {
        setIsWalking(false);
        animationFrame = requestAnimationFrame(loop);
        return;
      }

      let dx = 0;
      let dy = 0;
      const speed = 4;

      const querAndarFrente = keys.w || isTouchWalking;
      const currentY = posRef.current.y;

      if (querAndarFrente) {
        const nextY = currentY + speed;
        const currentLocalY = currentY % 300;
        const nextLocalY = nextY % 300;

        // Define onde começa o asfalto no bloco
        const estavaNaCalcada = currentLocalY <= 85 || currentLocalY >= 235;
        const tentandoEntrarNoAsfalto = estavaNaCalcada && (nextLocalY > 85 && nextLocalY < 235);

        // REGRA CLARA: 
        // Se você está na calçada e quer entrar na rua, só pode se o sinal estiver vermelho (!= green).
        // Se o sinal estiver verde e você tentar entrar na rua, perde vida e o movimento é travado.
        // Se você já está na rua, pode andar livremente para terminar de atravessar.
        if (!tentandoEntrarNoAsfalto || lightState !== 'green') {
          dy = speed; 
        } else {
          const agora = Date.now();
          if (agora - lastMistakeTime.current > 1000) {
            lastMistakeTime.current = agora;
            onLoseLife('sinal'); 
          }
          dy = 0; 
        }
      }

      if (keys.s) dy = -speed; 
      if (keys.a) dx = -speed; 
      if (keys.d) dx = speed;  

      let nextX = Math.max(30, Math.min(570, posRef.current.x + dx));
      let nextY = Math.max(minY, Math.min(maxY, posRef.current.y + dy));

      // --- RADAR DE COLISÃO COM OS CARROS ---
      const playerEl = document.querySelector('.pedestrian');
      const carEls = document.querySelectorAll('.vehicle'); 
      let sofreuAcidente = false;

      if (playerEl) {
        const pRect = playerEl.getBoundingClientRect();
        const marginX = 16; 
        const marginTop = 54; // Foco apenas nos pés do personagem
        const marginBottom = 0;

        for (const car of carEls) {
          const cRect = car.getBoundingClientRect();
          const cMarginY = 25; 
          const cMarginX = 14;

          if (
            pRect.left + marginX < cRect.right - cMarginX &&
            pRect.right - marginX > cRect.left + cMarginX &&
            pRect.top + marginTop < cRect.bottom - cMarginY &&
            pRect.bottom - marginBottom > cRect.top + cMarginY
          ) {
            sofreuAcidente = true;
            break;
          }
        }
      }

      if (sofreuAcidente) {
        const agora = Date.now();
        if (agora - lastMistakeTime.current > 1000) {
          lastMistakeTime.current = agora;
          onLoseLife('carro'); 
          nextY = Math.floor(currentY / 300) * 300; 
          nextX = 300; 
        } else {
          dy = 0; dx = 0;
          nextX = posRef.current.x; nextY = posRef.current.y;
        }
      }

      const estaMovendo = querAndarFrente || keys.s || keys.a || keys.d;

      if (estaMovendo || sofreuAcidente) {
        posRef.current = { x: nextX, y: nextY };
        setPosition(posRef.current);
        setIsWalking(dy !== 0 || dx !== 0); 
      } else {
        setIsWalking(false);
      }

      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrame);
    };
  }, [isTouchWalking, lightState, onLoseLife, isGameOver, minY, maxY]);

  return { position, isWalking, resetPosition };
}