import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import agente1 from '../../../assets/agente_1.png';
import agente2 from '../../../assets/agente_2.png';
import agente3 from '../../../assets/agente_3.png';
import agente6 from '../../../assets/agente_6.png';
import agente7 from '../../../assets/agente_7.png';

// Os quadros são IMPORTADOS, não montados como `/agente_${frame}.png`.
//
// O caminho em string era absoluto, e absoluto quer dizer "a partir da raiz
// do domínio". Publicado em zalanribeiro.github.io/JogoTransito/, ele pedia
// zalanribeiro.github.io/agente_1.png — 404, e o guarda virava o "?" de
// imagem quebrada. Só aparecia no ar: em localhost o jogo mora na raiz e o
// caminho batia por acidente.
//
// O Vite não reescreve caminho montado dentro de string; ele só resolve o
// que passa por import. Importando, cada quadro ganha URL com hash e
// acompanha a base do build, seja qual for a pasta onde o jogo esteja.
const QUADROS = { 1: agente1, 2: agente2, 3: agente3, 6: agente6, 7: agente7 };

// Largura aproximada do sprite parado (altura 95px) e folga até o carro,
// em px "locais" (coordenadas de antes da escala da arena). A folga
// precisa cobrir o braço estendido da pose "multando" (segurando a
// prancheta em direção ao veículo) — medida empiricamente encostando no
// ônibus (o veículo mais largo), que ficava ~24px sobreposto com uma
// folga de 12px.
const LARGURA_ESTIMADA_DO_GUARDA = 55;
const FOLGA_ATE_O_CARRO = 38;
const POSICAO_PADRAO = 100; // usada se não der pra medir o carro (ex: ele saiu da tela)

// Folga mínima até as bordas da arena. A LARGURA dela vem por prop: desde
// que ela passou a acompanhar a proporção da tela, um 600 fixo aqui fazia o
// guarda calcular espaço e escala errados numa arena mais larga — ele parava
// longe demais do carro e entrava pelo lado errado.
const MARGEM_DA_ARENA = 10;
const PASSO = 15;

// Ciclo de caminhada em "ping-pong": 1 (contato, perna da frente
// plantada) -> 2 (passagem, pernas cruzando) -> 3 (contato oposto) -> 2
// (passagem de novo) -> repete. Evita o salto visual de pular direto de
// um contato pro outro sem passar pela pose de transição no meio.
const SEQUENCIA_CAMINHADA = [1, 2, 3, 2];

// Guarda que aparece, multa o carro parado sobre a faixa e vai embora.
export default function AgenteAnimado({ onComplete, laneIndex, vehicleElsRef, arenaRef, larguraDaArena = 600 }) {
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

  // A largura da arena muda quando a janela é redimensionada, e o intervalo
  // da animação precisa da largura ATUAL para saber onde o guarda já saiu de
  // cena. Numa ref, e não na lista de dependências: pôr `larguraDaArena` nas
  // dependências recriaria o intervalo a cada pixel arrastado, reiniciando a
  // caminhada do guarda no meio do percurso.
  const larguraDaArenaRef = useRef(larguraDaArena);
  useEffect(() => {
    larguraDaArenaRef.current = larguraDaArena;
  }, [larguraDaArena]);

  useLayoutEffect(() => {
    const carEl = vehicleElsRef?.current?.get(laneIndex);
    const arenaEl = arenaRef?.current;
    if (!carEl || !arenaEl) {
      setLadoDecidido(true); // sem medida: entra pela esquerda, como antes
      return;
    }

    const carRect = carEl.getBoundingClientRect();
    const arenaRect = arenaEl.getBoundingClientRect();
    const escala = arenaRect.width / larguraDaArena;
    const esquerdaDoCarro = (carRect.left - arenaRect.left) / escala;
    const direitaDoCarro = (carRect.right - arenaRect.left) / escala;

    const espacoAEsquerda = esquerdaDoCarro - FOLGA_ATE_O_CARRO - MARGEM_DA_ARENA;
    const espacoADireita =
      larguraDaArena - MARGEM_DA_ARENA - (direitaDoCarro + FOLGA_ATE_O_CARRO);

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
        larguraDaArena - MARGEM_DA_ARENA - LARGURA_ESTIMADA_DO_GUARDA,
        direitaDoCarro + FOLGA_ATE_O_CARRO
      );
      setPosicaoX(larguraDaArena + LARGURA_ESTIMADA_DO_GUARDA);
    }
    setLadoDecidido(true);
  }, [laneIndex, vehicleElsRef, arenaRef, larguraDaArena]);

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
            direcaoRef.current === 1 ? x <= -60 : x >= larguraDaArenaRef.current + 60;
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
      src={QUADROS[frame]}
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
