import { useState, useEffect, useLayoutEffect, useRef } from 'react';

// Largura aproximada do sprite parado (altura 95px) e folga até o carro,
// em px "locais" (coordenadas de antes da escala da arena). A folga
// precisa cobrir o braço estendido da pose "multando" (segurando a
// prancheta em direção ao veículo) — medida empiricamente encostando no
// ônibus (o veículo mais largo), que ficava ~24px sobreposto com uma
// folga de 12px.
const LARGURA_ESTIMADA_DO_GUARDA = 55;
const FOLGA_ATE_O_CARRO = 38;
const POSICAO_PADRAO = 100; // usada se não der pra medir o carro (ex: ele saiu da tela)

// Coordenadas internas da arena, e a folga mínima até as bordas dela.
const LARGURA_ARENA = 600;
const MARGEM_DA_ARENA = 10;
const PASSO = 15;

// Ciclo de caminhada em "ping-pong": 1 (contato, perna da frente
// plantada) -> 2 (passagem, pernas cruzando) -> 3 (contato oposto) -> 2
// (passagem de novo) -> repete. Evita o salto visual de pular direto de
// um contato pro outro sem passar pela pose de transição no meio.
const SEQUENCIA_CAMINHADA = [1, 2, 3, 2];

// Guarda que aparece, multa o carro parado sobre a faixa e vai embora.
export default function AgenteAnimado({ onComplete, laneIndex, vehicleElsRef, arenaRef }) {
  const [fase, setFase] = useState('entrando');
  const [frame, setFrame] = useState(1);
  const [posicaoX, setPosicaoX] = useState(-50);
  // 1 = entra pela esquerda andando para a direita; -1 = o contrário.
  const [direcao, setDirecao] = useState(1);
  const direcaoRef = useRef(1); // o intervalo lê daqui, sem se recriar
  const indiceCaminhadaRef = useRef(0);
  // Nada é desenhado antes de saber por qual lado ele entra. Sem isto ele
  // aparecia na esquerda (posição inicial), o efeito descobria que precisava
  // vir pela direita e o `transition: left` animava a correção — o guarda
  // atravessava a tela inteira antes de começar a andar.
  const [ladoDecidido, setLadoDecidido] = useState(false);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Mede a posição real do carro UMA vez, ao montar, e para logo antes
  // dele — nunca em cima, driblando o número fixo de antes que às vezes
  // deixava o guarda sobreposto ao carro.
  //
  // O lado por onde ele chega também é decidido aqui. Um ônibus parado sobre
  // a faixa chega a ocupar metade da arena e muitas vezes tem a traseira já
  // fora da tela: antes, sem espaço à esquerda, o guarda era empurrado para a
  // borda (Math.max(10, ...)) e acabava desenhado EM CIMA do ônibus. Agora,
  // quando não cabe de um lado, ele vem do outro.
  // useLayoutEffect e não useEffect: a medição precisa acontecer ANTES da
  // primeira pintura, senão o navegador chega a desenhar o guarda no lado
  // errado por um quadro.
  const alvoXRef = useRef(POSICAO_PADRAO);
  useLayoutEffect(() => {
    const carEl = vehicleElsRef?.current?.get(laneIndex);
    const arenaEl = arenaRef?.current;
    if (!carEl || !arenaEl) {
      setLadoDecidido(true); // sem medida: entra pela esquerda, como antes
      return;
    }

    const carRect = carEl.getBoundingClientRect();
    const arenaRect = arenaEl.getBoundingClientRect();
    const escala = arenaRect.width / LARGURA_ARENA;
    const esquerdaDoCarro = (carRect.left - arenaRect.left) / escala;
    const direitaDoCarro = (carRect.right - arenaRect.left) / escala;

    const espacoAEsquerda = esquerdaDoCarro - FOLGA_ATE_O_CARRO - MARGEM_DA_ARENA;
    const espacoADireita =
      LARGURA_ARENA - MARGEM_DA_ARENA - (direitaDoCarro + FOLGA_ATE_O_CARRO);

    const cabeAEsquerda = espacoAEsquerda >= LARGURA_ESTIMADA_DO_GUARDA;
    const cabeADireita = espacoADireita >= LARGURA_ESTIMADA_DO_GUARDA;
    // Se não couber dos dois lados (veículo atravessado na tela inteira),
    // fica com o lado mais folgado: melhor um pouco apertado do que em cima.
    const vemPelaEsquerda = cabeAEsquerda || (!cabeADireita && espacoAEsquerda >= espacoADireita);

    if (vemPelaEsquerda) {
      direcaoRef.current = 1;
      setDirecao(1);
      alvoXRef.current = Math.max(
        MARGEM_DA_ARENA,
        esquerdaDoCarro - FOLGA_ATE_O_CARRO - LARGURA_ESTIMADA_DO_GUARDA
      );
      setPosicaoX(-LARGURA_ESTIMADA_DO_GUARDA);
    } else {
      direcaoRef.current = -1;
      setDirecao(-1);
      alvoXRef.current = Math.min(
        LARGURA_ARENA - MARGEM_DA_ARENA - LARGURA_ESTIMADA_DO_GUARDA,
        direitaDoCarro + FOLGA_ATE_O_CARRO
      );
      setPosicaoX(LARGURA_ARENA + LARGURA_ESTIMADA_DO_GUARDA);
    }
    setLadoDecidido(true);
  }, [laneIndex, vehicleElsRef, arenaRef]);

  useEffect(() => {
    let interval;
    let timeout;

    if (fase === 'entrando') {
      interval = setInterval(() => {
        indiceCaminhadaRef.current = (indiceCaminhadaRef.current + 1) % SEQUENCIA_CAMINHADA.length;
        setFrame(SEQUENCIA_CAMINHADA[indiceCaminhadaRef.current]);

        setPosicaoX((x) => {
          const chegou = direcaoRef.current === 1 ? x >= alvoXRef.current : x <= alvoXRef.current;
          if (chegou) {
            setFase('multando');
            setFrame(6);
            return alvoXRef.current;
          }
          return x + PASSO * direcaoRef.current;
        });
      }, 150);

    } else if (fase === 'multando') {
      interval = setInterval(() => {
        setFrame((f) => (f === 6 ? 7 : 6));
      }, 250);

      timeout = setTimeout(() => {
        setFase('saindo');
        indiceCaminhadaRef.current = 0;
        setFrame(1);
      }, 10000);

    } else if (fase === 'saindo') {
      interval = setInterval(() => {
        indiceCaminhadaRef.current = (indiceCaminhadaRef.current + 1) % SEQUENCIA_CAMINHADA.length;
        setFrame(SEQUENCIA_CAMINHADA[indiceCaminhadaRef.current]);

        setPosicaoX((x) => {
          // Vai embora pelo mesmo lado por onde chegou.
          const saiu =
            direcaoRef.current === 1 ? x <= -60 : x >= LARGURA_ARENA + 60;
          if (saiu) {
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
            return x;
          }
          return x - PASSO * direcaoRef.current;
        });
      }, 150);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [fase]);

  // O elemento só entra no DOM já na posição certa: um elemento recém-inserido
  // não dispara transição, então não há varredura de tela.
  if (!ladoDecidido) return null;

  return (
    <img
      src={`/agente_${frame}.png`}
      alt=""
      style={{
        position: 'absolute',
        left: `${posicaoX}px`,
        bottom: '10px',
        height: '95px',
        zIndex: 85,
        transition: 'left 0.15s linear',
        filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.4))',
        // O sprite é desenhado virado para a direita. Ele olha para onde está
        // andando e, ao multar, para o veículo — que está sempre do lado
        // oposto ao que ele entrou.
        transform: (direcao === -1) !== (fase === 'saindo') ? 'scaleX(-1)' : 'none'
      }}
    />
  );
}
