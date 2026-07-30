import { useState, useEffect, useRef } from 'react';
import { mod3, crosswalkIndexFor } from '../gameGrid';

// Sistema do botão "Chamar Guarda": detecta carro parado sobre a faixa de
// pedestre DO PAR ATUAL/PRÓXIMO do jogador (nunca uma faixa mais à frente,
// que ele ainda nem alcançou) e controla quais faixas estão interditadas
// por um agente enquanto ele multa o carro.

// Bônus por acionar o guarda. Mantido próximo do que vale uma travessia
// completa (~6 pontos) de propósito: com o valor antigo (20) apertar o
// botão rendia mais de 3 travessias, então compensava mais ficar caçando
// carro parado do que praticar a travessia segura — o oposto da lição que
// o jogo quer passar. A recompensa de verdade é a faixa liberada.
// Exportado pra que o texto do botão use o mesmo número da regra — antes o
// rótulo estava escrito à mão e continuou dizendo "+20" depois que o valor
// mudou.
export const BONUS_CHAMAR_GUARDA = 5;

// Faixas muito atrás do jogador nunca voltam a ser escaneadas (o radar só
// olha o par atual/próximo, e só dá pra andar pra trás dentro da própria
// cena), então podem sair da lista de já-atendidas em vez de crescer sem
// limite durante uma partida longa.
const FAIXAS_ATRAS_A_MANTER = 6;
export default function useGuardSystem({ arenaRef, vehicleElsRef, lightState, gameState, currentIndex, ruaQueFura, onPenalidade }) {
  const [agentesChamados, setAgentesChamados] = useState([]);
  const [guardasAtivos, setGuardasAtivos] = useState([]);
  const guardasAtivosRef = useRef([]);

  // Precisa ser lido dentro do intervalo sempre atualizado — o efeito do
  // scanner só é recriado quando lightState/gameState mudam, não a cada
  // passo do jogador, então uma variável comum aqui ficaria presa na
  // posição de quando o sinal ficou vermelho.
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const [faixasComCarroParado, setFaixasComCarroParado] = useState([]);

  // Espelho síncrono de agentesChamados, usado por chamarGuarda para não
  // depender do estado, que só chega no render seguinte.
  const jaAtendidasRef = useRef(new Set());

  useEffect(() => {
    guardasAtivosRef.current = guardasAtivos;
  }, [guardasAtivos]);

  // O scanner só é recriado quando o sinal/estado muda, então precisa ler a
  // rua do carro furão por ref. Espelhado num efeito (e não durante o render)
  // pelo mesmo motivo de guardasAtivosRef acima; o atraso de um render é
  // irrelevante para um radar que roda a cada 300ms.
  const ruaQueFuraRef = useRef(null);
  useEffect(() => {
    ruaQueFuraRef.current = ruaQueFura;
  }, [ruaQueFura]);

  // Descarta as faixas já atendidas que ficaram para trás. Devolver o
  // array original quando nada muda evita re-render a cada passo.
  useEffect(() => {
    const limite = currentIndex - FAIXAS_ATRAS_A_MANTER;
    setAgentesChamados((prev) => {
      const restantes = prev.filter((lane) => lane >= limite);
      return restantes.length === prev.length ? prev : restantes;
    });
    jaAtendidasRef.current.forEach((lane) => {
      if (lane < limite) jaAtendidasRef.current.delete(lane);
    });
  }, [currentIndex]);

  // Radar: enquanto o sinal está vermelho (pedestre pode atravessar), varre
  // SÓ a faixa de pedestre do par atual/próximo do jogador — nunca uma
  // faixa mais à frente que ele ainda não alcançou, mesmo que ela já
  // esteja renderizada na tela (o alcance de renderização vai bem além do
  // que é relevante chamar guarda agora).
  useEffect(() => {
    if (lightState === 'red' && gameState === 'playing') {
      const scanner = setInterval(() => {
        if (!arenaRef.current) return;

        const indiceDaFaixaAlvo = crosswalkIndexFor(currentIndexRef.current);
        const faixaEl = arenaRef.current.querySelector(`.crosswalk[data-crosswalk-index="${indiceDaFaixaAlvo}"]`);
        if (!faixaEl) {
          setFaixasComCarroParado([]);
          return;
        }

        const faixaRect = faixaEl.getBoundingClientRect();
        // Horizontalmente precisa cobrir uma fração real da largura da
        // faixa (não só encostar numa borda); verticalmente basta
        // qualquer sobreposição, já que o carro inteiro já está dentro da
        // rua correspondente àquela faixa.
        const limiarX = faixaRect.width * 0.3;

        const novasFaixasComCarro = [];

        vehicleElsRef.current.forEach((el, laneIndex) => {
          // O carro que está furando o sinal cruza a faixa em MOVIMENTO: não é
          // um carro parado irregularmente. Sem esta exceção ele apareceria no
          // radar, o jogador ganharia o bônus por chamar o guarda para quem
          // ninguém consegue multar, e a faixa contaria como bloqueada —
          // servindo de desculpa falsa para atravessar fora dela.
          if (laneIndex === ruaQueFuraRef.current) return;

          const indiceDaFaixaDoCarro = mod3(laneIndex) === 2 ? laneIndex : laneIndex + 1;
          if (indiceDaFaixaDoCarro !== indiceDaFaixaAlvo) return; // não é a faixa atual/próxima do jogador

          const carRect = el.getBoundingClientRect();
          const sobreposicaoX = Math.min(carRect.right, faixaRect.right) - Math.max(carRect.left, faixaRect.left);
          const sobreposicaoY = Math.min(carRect.bottom, faixaRect.bottom) - Math.max(carRect.top, faixaRect.top);

          if (sobreposicaoX >= limiarX && sobreposicaoY > 0) {
            novasFaixasComCarro.push(laneIndex);
          }
        });

        setFaixasComCarroParado(novasFaixasComCarro);
      }, 300);

      return () => clearInterval(scanner);
    } else {
      setFaixasComCarroParado([]);
    }
  }, [lightState, gameState, arenaRef, vehicleElsRef]);

  // A faixa atual/próxima tem no máximo 2 ruas (perto e longe do mesmo
  // par); se as duas tiverem carro, prioriza a mais perto do jogador.
  const pistaValidaProxima = faixasComCarroParado
    .filter((lane) => !agentesChamados.includes(lane) && !guardasAtivos.includes(lane))
    .sort((a, b) => Math.abs(currentIndex - a) - Math.abs(currentIndex - b))[0];

  const chamarGuarda = () => {
    if (pistaValidaProxima === undefined) return;

    // Trava síncrona, além da checagem por estado acima. `agentesChamados`
    // só é atualizado no próximo render: dois disparos antes disso (tecla
    // repetindo, um clique somado ao atalho) enxergariam o mesmo
    // pistaValidaProxima e creditariam o bônus duas vezes pela mesma faixa.
    if (jaAtendidasRef.current.has(pistaValidaProxima)) return;
    jaAtendidasRef.current.add(pistaValidaProxima);

    onPenalidade((p) => p - BONUS_CHAMAR_GUARDA);
    setAgentesChamados((prev) => [...prev, pistaValidaProxima]);
    setGuardasAtivos((prev) => [...prev, pistaValidaProxima]);
  };

  const liberarGuarda = (lane) => {
    setGuardasAtivos((prev) => prev.filter((id) => id !== lane));
  };

  const resetGuardas = () => {
    jaAtendidasRef.current.clear();
    setAgentesChamados([]);
    setGuardasAtivos([]);
    setFaixasComCarroParado([]);
  };

  return { guardasAtivos, guardasAtivosRef, pistaValidaProxima, faixasComCarroParado, chamarGuarda, liberarGuarda, resetGuardas };
}
