import { useState, useEffect, useCallback, useRef } from 'react';
import { SEGMENT_HEIGHT, CYCLE_LENGTH, segmentType, estaNaCalcadaComMargem } from '../gameGrid';

// Escala em que as margens de colisão abaixo foram calibradas visualmente.
const REFERENCE_SCALE = 1.4;

// Ao perder uma vida o jogador volta pra calçada e fica um tempo imóvel e
// intocável, piscando. Sem essa janela ele era atingido de novo no frame
// seguinte (ainda encostado no carro) e perdia várias vidas de uma vez.
export const DURACAO_RESPAWN_MS = 1400;

export default function usePlayerMovement(isTouchWalking, lightState, onLoseLife, isGameOver, playerElRef, vehicleElsRef, scale = 1, isTouchLeft = false, isTouchRight = false) {
  const posRef = useRef({ x: 300, y: 0 });
  const [position, setPosition] = useState(posRef.current);
  const [isWalking, setIsWalking] = useState(false);
  const [isRespawning, setIsRespawning] = useState(false);
  const lastMistakeTime = useRef(0);
  const invulneravelAteRef = useRef(0);
  // Espelha isRespawning pra decidir, dentro do loop de animação, se o
  // estado precisa mudar — evita chamar setState 60x por segundo.
  const respawnAtivoRef = useRef(false);

  const resetPosition = useCallback(() => {
    posRef.current = { ...posRef.current, y: 0 };
    setPosition(posRef.current);
    invulneravelAteRef.current = 0;
    respawnAtivoRef.current = false;
    setIsRespawning(false);
  }, []);

  // Joga o jogador de volta pra calçada onde o ciclo atual começou e abre a
  // janela de invulnerabilidade. Chamado pela GameArena sempre que uma vida
  // é perdida, qualquer que seja o motivo (carro, sinal ou pontos zerados).
  const respawnNaCalcada = useCallback(() => {
    posRef.current = {
      x: 300,
      y: Math.floor(posRef.current.y / CYCLE_LENGTH) * CYCLE_LENGTH,
    };
    setPosition(posRef.current);
    invulneravelAteRef.current = Date.now() + DURACAO_RESPAWN_MS;
    respawnAtivoRef.current = true;
    setIsRespawning(true);
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

      const agora = Date.now();
      if (respawnAtivoRef.current && agora >= invulneravelAteRef.current) {
        respawnAtivoRef.current = false;
        setIsRespawning(false);
      }

      // Durante o respawn o jogador fica parado e intocável: nem anda nem
      // sofre colisão, senão voltaria a bater no mesmo carro imediatamente.
      if (agora < invulneravelAteRef.current) {
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
        const estavaNaCalcada = estaNaCalcadaComMargem(currentY);
        const tentandoEntrarNoAsfalto = estavaNaCalcada && !estaNaCalcadaComMargem(nextY);

        // REGRA CLARA:
        // Se você está na calçada e quer entrar na rua, só pode se o sinal estiver vermelho.
        // Se o sinal estiver verde OU amarelo (carros ainda em movimento nos dois) e você
        // tentar entrar na rua, perde vida e o movimento é travado.
        // Se você já está na rua, pode andar livremente para terminar de atravessar.
        const carrosAindaPassando = lightState === 'green' || lightState === 'yellow';
        if (!tentandoEntrarNoAsfalto || !carrosAindaPassando) {
          dy = speed;
        } else {
          if (agora - lastMistakeTime.current > 1000) {
            lastMistakeTime.current = agora;
            // A GameArena responde a isto chamando respawnNaCalcada(), que
            // já reposiciona o jogador — por isso encerramos o frame aqui,
            // pra não sobrescrever a posição de respawn logo abaixo.
            onLoseLife('sinal');
            setIsWalking(false);
            animationFrame = requestAnimationFrame(loop);
            return;
          }
          dy = 0;
        }
      }

      if (keys.s) dy = -speed;
      if (keys.a || isTouchLeft) dx = -speed;
      if (keys.d || isTouchRight) dx = speed;

      let nextX = Math.max(30, Math.min(570, posRef.current.x + dx));

      // Andar pra trás só é permitido dentro da própria cena atual (a
      // calçada ou rua em que o jogador já está) — não dá pra recuar pra
      // cena anterior nem "escapar" de uma rua andando de costas driblando
      // a regra do sinal, que só existe pra quem anda pra frente.
      const inicioDaCenaAtual = Math.floor(currentY / SEGMENT_HEIGHT) * SEGMENT_HEIGHT;
      let nextY = Math.max(inicioDaCenaAtual, posRef.current.y + dy);

      // --- RADAR DE COLISÃO COM OS CARROS ---
      // Usa as refs que o React já mantém no mount/unmount dos componentes,
      // em vez de refazer querySelectorAll a cada frame (60x/s).
      // Na calçada nunca há atropelamento, mesmo que o sprite do boneco
      // (mais alto que os pés) se sobreponha visualmente a um carro perto
      // da borda — quem decide é o segmento onde o jogador está de fato,
      // não a caixa delimitadora da imagem.
      const naCalcada = segmentType(Math.floor(currentY / SEGMENT_HEIGHT)) === 'calcada';
      const playerEl = playerElRef?.current;
      const carEls = vehicleElsRef?.current ? vehicleElsRef.current.values() : [];
      let sofreuAcidente = false;

      if (playerEl && !naCalcada) {
        const pRect = playerEl.getBoundingClientRect();
        // getBoundingClientRect já vem em pixels de tela (pós-transform:scale
        // da arena). As margens abaixo foram calibradas visualmente em
        // REFERENCE_SCALE; escalamos proporcionalmente para continuar
        // acertando "só os pés" em qualquer tamanho de tela.
        const fatorMargem = scale / REFERENCE_SCALE;
        const marginX = 16 * fatorMargem;
        const marginTop = 54 * fatorMargem; // Foco apenas nos pés do personagem
        const marginBottom = 0;

        for (const car of carEls) {
          const cRect = car.getBoundingClientRect();
          const cMarginY = 25 * fatorMargem;
          const cMarginX = 14 * fatorMargem;

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
        if (agora - lastMistakeTime.current > 1000) {
          lastMistakeTime.current = agora;
          onLoseLife('carro');
        }
        // Bateu: quem reposiciona é o respawnNaCalcada disparado pela
        // GameArena. O frame termina aqui pra que o passo que causou a
        // batida não sobrescreva a posição de respawn.
        setIsWalking(false);
        animationFrame = requestAnimationFrame(loop);
        return;
      }

      const estaMovendo = querAndarFrente || keys.s || keys.a || keys.d || isTouchLeft || isTouchRight;

      if (estaMovendo) {
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
  }, [isTouchWalking, lightState, onLoseLife, isGameOver, playerElRef, vehicleElsRef, scale, isTouchLeft, isTouchRight]);

  return { position, isWalking, isRespawning, resetPosition, respawnNaCalcada };
}