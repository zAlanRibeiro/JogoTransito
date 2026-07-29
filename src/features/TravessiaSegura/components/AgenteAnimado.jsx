import { useState, useEffect, useRef } from 'react';

// Largura aproximada do sprite parado (altura 95px) e folga até o carro,
// em px "locais" (coordenadas de antes da escala da arena). A folga
// precisa cobrir o braço estendido da pose "multando" (segurando a
// prancheta em direção ao veículo) — medida empiricamente encostando no
// ônibus (o veículo mais largo), que ficava ~24px sobreposto com uma
// folga de 12px.
const LARGURA_ESTIMADA_DO_GUARDA = 55;
const FOLGA_ATE_O_CARRO = 38;
const POSICAO_PADRAO = 100; // usada se não der pra medir o carro (ex: ele saiu da tela)

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
  const indiceCaminhadaRef = useRef(0);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Mede a posição real do carro UMA vez, ao montar, e para logo antes
  // dele — nunca em cima, driblando o número fixo de antes que às vezes
  // deixava o guarda sobreposto ao carro.
  const alvoXRef = useRef(POSICAO_PADRAO);
  useEffect(() => {
    const carEl = vehicleElsRef?.current?.get(laneIndex);
    const arenaEl = arenaRef?.current;
    if (!carEl || !arenaEl) return;

    const carRect = carEl.getBoundingClientRect();
    const arenaRect = arenaEl.getBoundingClientRect();
    const scale = arenaRect.width / 600;
    const carLeftLocal = (carRect.left - arenaRect.left) / scale;

    alvoXRef.current = Math.max(10, carLeftLocal - LARGURA_ESTIMADA_DO_GUARDA - FOLGA_ATE_O_CARRO);
  }, [laneIndex, vehicleElsRef, arenaRef]);

  useEffect(() => {
    let interval;
    let timeout;

    if (fase === 'entrando') {
      interval = setInterval(() => {
        indiceCaminhadaRef.current = (indiceCaminhadaRef.current + 1) % SEQUENCIA_CAMINHADA.length;
        setFrame(SEQUENCIA_CAMINHADA[indiceCaminhadaRef.current]);

        setPosicaoX((x) => {
          if (x >= alvoXRef.current) {
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
        indiceCaminhadaRef.current = 0;
        setFrame(1);
      }, 10000);

    } else if (fase === 'saindo') {
      interval = setInterval(() => {
        indiceCaminhadaRef.current = (indiceCaminhadaRef.current + 1) % SEQUENCIA_CAMINHADA.length;
        setFrame(SEQUENCIA_CAMINHADA[indiceCaminhadaRef.current]);

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
      alt=""
      style={{
        position: 'absolute',
        left: `${posicaoX}px`,
        bottom: '10px',
        height: '95px',
        zIndex: 85,
        transition: 'left 0.15s linear',
        filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.4))',
        transform: fase === 'saindo' ? 'scaleX(-1)' : 'none'
      }}
    />
  );
}
