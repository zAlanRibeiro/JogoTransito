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

// Sempre o MESMO array vazio. `[]` novo a cada vez tem identidade diferente e
// faria o React considerar o estado alterado, disparando um render por
// engano em toda troca de sinal.
const SEM_FAIXAS = [];
export default function useGuardSystem({ arenaRef, vehicleElsRef, lightState, gameState, currentIndex, ruaQueFura, onPenalidade }) {
  const [agentesChamados, setAgentesChamados] = useState([]);
  const [guardasAtivos, setGuardasAtivos] = useState([]);
  const guardasAtivosRef = useRef([]);

  // Precisa ser lido dentro do intervalo sempre atualizado — o efeito do
  // scanner só é recriado quando lightState/gameState mudam, não a cada
  // passo do jogador, então uma variável comum aqui ficaria presa na
  // posição de quando o sinal ficou vermelho.
  //
  // Espelhado num efeito, e não durante o render, pelo mesmo motivo dos
  // outros dois espelhos deste arquivo: quem lê é o radar de 300ms, para
  // quem o atraso de um render não significa nada.
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const [faixasComCarroParado, setFaixasComCarroParado] = useState(SEM_FAIXAS);

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

  // Descarta as faixas já atendidas que ficaram para trás.
  //
  // Isto já foi um efeito disparado a cada passo do jogador, o que era um
  // setState no corpo de um efeito rodando o tempo todo. A limpeza só existe
  // para as listas não crescerem sem limite numa partida longa, e elas só
  // crescem quando um guarda é chamado — então limpar junto de quem faz
  // crescer cobre exatamente os mesmos casos, sem render nenhum a mais.
  const descartarFaixasParaTras = (lista) =>
    lista.filter((lane) => lane >= currentIndex - FAIXAS_ATRAS_A_MANTER);

  // Radar: enquanto o sinal está vermelho (pedestre pode atravessar), varre
  // SÓ a faixa de pedestre do par atual/próximo do jogador — nunca uma
  // faixa mais à frente que ele ainda não alcançou, mesmo que ela já
  // esteja renderizada na tela (o alcance de renderização vai bem além do
  // que é relevante chamar guarda agora).
  //
  // O radar só roda com o sinal vermelho e o jogo em andamento. Quando ele
  // desliga, a lista é esvaziada NA LIMPEZA do efeito, e não num `else` no
  // corpo dele: o `else` era um setState síncrono durante o efeito, mas
  // esvaziar continua sendo obrigatório. Sem isso, ao abrir o vermelho de
  // novo a leitura do ciclo anterior valeria por até 300ms — tempo suficiente
  // para o jogador ganhar bônus chamando guarda para um carro que já saiu, e
  // para a faixa contar como bloqueada, servindo de desculpa falsa para
  // atravessar fora dela.
  useEffect(() => {
    if (lightState === 'red' && gameState === 'playing') {
      const scanner = setInterval(() => {
        if (!arenaRef.current) return;

        const indiceDaFaixaAlvo = crosswalkIndexFor(currentIndexRef.current);
        const faixaEl = arenaRef.current.querySelector(`.crosswalk[data-crosswalk-index="${indiceDaFaixaAlvo}"]`);
        if (!faixaEl) {
          setFaixasComCarroParado(SEM_FAIXAS);
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

      return () => {
        clearInterval(scanner);
        setFaixasComCarroParado(SEM_FAIXAS);
      };
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
    setAgentesChamados((prev) => [...descartarFaixasParaTras(prev), pistaValidaProxima]);
    setGuardasAtivos((prev) => [...prev, pistaValidaProxima]);

    jaAtendidasRef.current.forEach((lane) => {
      if (lane < currentIndex - FAIXAS_ATRAS_A_MANTER) jaAtendidasRef.current.delete(lane);
    });
  };

  const liberarGuarda = (lane) => {
    setGuardasAtivos((prev) => prev.filter((id) => id !== lane));
  };

  const resetGuardas = () => {
    jaAtendidasRef.current.clear();
    setAgentesChamados([]);
    setGuardasAtivos([]);
    setFaixasComCarroParado(SEM_FAIXAS);
  };

  return { guardasAtivos, guardasAtivosRef, pistaValidaProxima, faixasComCarroParado, chamarGuarda, liberarGuarda, resetGuardas };
}
