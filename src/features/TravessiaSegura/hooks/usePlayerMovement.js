import { useState, useEffect, useCallback, useRef } from 'react';
import { SEGMENT_HEIGHT, CYCLE_LENGTH, segmentType, estaNaCalcadaComMargem } from '../gameGrid';

// Escala em que as margens de colisão abaixo foram calibradas visualmente.
const REFERENCE_SCALE = 1.4;

// Ao perder uma vida o jogador volta pra calçada e fica um tempo imóvel e
// intocável, piscando. Sem essa janela ele era atingido de novo no frame
// seguinte (ainda encostado no carro) e perdia várias vidas de uma vez.
export const DURACAO_RESPAWN_MS = 1400;

// Direção neutra, usada quando não há joystick (computador) ou antes do
// primeiro toque.
const PARADO = { frente: false, tras: false, esquerda: false, direita: false };

// Velocidade do jogador em pixels da arena POR SEGUNDO — não por quadro.
//
// Era 4px por quadro de requestAnimationFrame, que dispara na taxa de
// atualização da TELA. Num monitor de 60Hz isso dava 240px/s, que é a
// velocidade para a qual o jogo foi calibrado (o difficulty.js parte de que
// atravessar as duas pistas leva cerca de 1s). Só que celular moderno é de
// 90Hz ou 120Hz: o mesmo código entregava 360 ou 480px/s, e o boneco corria
// 1,5x a 2x mais rápido que o previsto — enquanto os carros (animação CSS) e
// o semáforo (setTimeout) continuavam no relógio. Daí a sensação de jogo
// acelerado só no celular.
//
// 240 mantém exatamente o que se via a 60Hz e passa a valer em qualquer tela.
const VELOCIDADE_POR_SEGUNDO = 240;

// Teto para o intervalo entre quadros. Se a aba trava, volta do segundo
// plano ou o aparelho engasga, o tempo decorrido pode ser de centenas de
// milissegundos: sem este limite o passo proporcional teleportaria o boneco
// dezenas de pixels de uma vez, atravessando um carro sem que o radar de
// colisão — que só olha a posição de cada quadro — chegasse a vê-lo.
const MAIOR_PASSO_EM_SEGUNDOS = 0.05;

// WASD e as setas fazem a mesma coisa: quem não tem costume de jogar no
// computador procura as setas primeiro. Um Map (e não um objeto) porque a
// chave vem de e.key, que pode ser qualquer string — inclusive nomes de
// propriedades herdadas de Object, que num objeto comum dariam acerto falso.
const TECLAS_DE_MOVIMENTO = new Map([
  ['w', 'frente'],
  ['arrowup', 'frente'],
  ['s', 'tras'],
  ['arrowdown', 'tras'],
  ['a', 'esquerda'],
  ['arrowleft', 'esquerda'],
  ['d', 'direita'],
  ['arrowright', 'direita'],
]);

// `toqueRef` carrega a direção do joystick: { frente, tras, esquerda,
// direita }. É uma REF, e não três booleanos de estado como antes, por dois
// motivos. O joystick muda dezenas de vezes por segundo enquanto o dedo se
// arrasta, e cada mudança de estado remontaria este efeito inteiro —
// derrubando os listeners de teclado e reiniciando o requestAnimationFrame.
// Numa ref, o laço lê o valor mais recente sem que nada precise reexecutar.
export default function usePlayerMovement(toqueRef, lightState, onLoseLife, isGameOver, playerElRef, vehicleElsRef, scale = 1, larguraDaArena = 600) {
  // O jogador nasce no meio da arena, seja qual for a largura dela.
  const posRef = useRef({ x: larguraDaArena / 2, y: 0 });
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
      x: larguraDaArena / 2,
      y: Math.floor(posRef.current.y / CYCLE_LENGTH) * CYCLE_LENGTH,
    };
    setPosition(posRef.current);
    invulneravelAteRef.current = Date.now() + DURACAO_RESPAWN_MS;
    respawnAtivoRef.current = true;
    setIsRespawning(true);
    // larguraDaArena entra na lista porque o respawn passou a devolver o
    // jogador ao meio da arena, e o meio depende dela. Sem a dependência,
    // girar o aparelho no meio da partida faria o próximo respawn usar a
    // largura antiga e o boneco reapareceria fora do centro.
  }, [larguraDaArena]);

  useEffect(() => {
    const acoes = { frente: false, tras: false, esquerda: false, direita: false };
    let animationFrame;

    const atualizarAcao = (e, pressionada) => {
      const acao = TECLAS_DE_MOVIMENTO.get(e.key.toLowerCase());
      if (!acao) return;
      acoes[acao] = pressionada;
      // As setas rolam a página por padrão; sem isto o cenário pularia
      // enquanto o jogador anda.
      if (e.key.startsWith('Arrow')) e.preventDefault();
    };

    const handleKeyDown = (e) => atualizarAcao(e, true);
    const handleKeyUp = (e) => atualizarAcao(e, false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Instante do quadro anterior, para medir quanto tempo passou de fato.
    let instanteAnterior = performance.now();

    const loop = () => {
      // Atualizado ANTES de qualquer saída antecipada: se ficasse só no
      // caminho em que o jogador anda, uma pausa (ou o respawn logo abaixo)
      // acumularia tempo parado e o primeiro quadro depois dela daria um
      // salto.
      const instante = performance.now();
      const decorrido = Math.min((instante - instanteAnterior) / 1000, MAIOR_PASSO_EM_SEGUNDOS);
      instanteAnterior = instante;

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
      const speed = VELOCIDADE_POR_SEGUNDO * decorrido;

      const toque = toqueRef?.current ?? PARADO;
      const querAndarFrente = acoes.frente || toque.frente;
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

      if (acoes.tras || toque.tras) dy = -speed;
      if (acoes.esquerda || toque.esquerda) dx = -speed;
      if (acoes.direita || toque.direita) dx = speed;

      // A margem de 30px vale dos dois lados; o limite direito acompanha a
      // largura da arena em vez do 570 fixo, que prendia o jogador ao
      // primeiro terço de uma tela larga.
      let nextX = Math.max(30, Math.min(larguraDaArena - 30, posRef.current.x + dx));

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

      const estaMovendo =
        querAndarFrente ||
        acoes.tras || acoes.esquerda || acoes.direita ||
        toque.tras || toque.esquerda || toque.direita;

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
  }, [toqueRef, lightState, onLoseLife, isGameOver, playerElRef, vehicleElsRef, scale, larguraDaArena]);

  return { position, isWalking, isRespawning, resetPosition, respawnNaCalcada };
}