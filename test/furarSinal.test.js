import { describe, it, expect } from 'vitest';
import { sortearRuaQueFura, RUAS_ENTRE_FURADAS } from '../src/features/TravessiaSegura/furarSinal';
import { ordemDaRua, segmentType } from '../src/features/TravessiaSegura/gameGrid';

// Gerador falso: devolve os valores na ordem em que forem pedidos. Deixa o
// teste dizer exatamente "esse sorteio passou" ou "esse sorteio falhou".
function aleatorioFixo(...valores) {
  let i = 0;
  return () => valores[i++ % valores.length];
}

const SEMPRE_PASSA = 0;
const SEMPRE_FALHA = 0.99;

describe('sortearRuaQueFura', () => {
  it('não devolve nada quando o sorteio não passa na chance', () => {
    const resultado = sortearRuaQueFura({
      indiceDoJogador: 0,
      ultimaOrdem: -Infinity,
      chance: 0.2,
      aleatorio: aleatorioFixo(SEMPRE_FALHA),
    });
    expect(resultado).toBeNull();
  });

  it('devolve uma das duas ruas do par que o jogador vai atravessar', () => {
    // Jogador na calçada de índice 0: o par à frente são as ruas 1 e 2.
    for (const escolha of [0, 0.99]) {
      const { rua } = sortearRuaQueFura({
        indiceDoJogador: 0,
        ultimaOrdem: -Infinity,
        chance: 1,
        aleatorio: aleatorioFixo(SEMPRE_PASSA, escolha),
      });
      expect([1, 2]).toContain(rua);
      expect(segmentType(rua)).toBe('rua');
    }
  });

  it('nunca escolhe uma rua que o jogador já deixou para trás', () => {
    // Jogador já na rua de longe (índice 5): o par dele são as ruas 4 e 5.
    const { rua } = sortearRuaQueFura({
      indiceDoJogador: 5,
      ultimaOrdem: -Infinity,
      chance: 1,
      aleatorio: aleatorioFixo(SEMPRE_PASSA, 0),
    });
    expect([4, 5]).toContain(rua);
  });

  // Furou na 2ª rua (índice 2). O par imediatamente à frente é a 3ª rua
  // (índice 4, distância 1) e a 4ª (índice 5, distância 2): as duas estão
  // perto demais, então o par inteiro fica de fora.
  it('bloqueia o par inteiro que vem logo depois de uma furada', () => {
    expect(ordemDaRua(2)).toBe(2);
    expect(ordemDaRua(4)).toBe(3);
    expect(ordemDaRua(5)).toBe(4);

    const resultado = sortearRuaQueFura({
      indiceDoJogador: 3, // calçada logo antes das ruas 4 e 5
      ultimaOrdem: ordemDaRua(2),
      chance: 1,
      aleatorio: aleatorioFixo(SEMPRE_PASSA, 0),
    });
    expect(resultado).toBeNull();
  });

  // O par seguinte a esse já pode: a 5ª rua (índice 7) está exatamente 3 ruas
  // depois da 2ª. Na prática, o jogador atravessa três ruas em paz antes de
  // outro carro poder furar.
  it('libera de novo três ruas depois', () => {
    const resultado = sortearRuaQueFura({
      indiceDoJogador: 6, // calçada logo antes das ruas 7 e 8
      ultimaOrdem: ordemDaRua(2),
      chance: 1,
      aleatorio: aleatorioFixo(SEMPRE_PASSA, 0),
    });
    expect([7, 8]).toContain(resultado.rua);
    expect(resultado.ordem - ordemDaRua(2)).toBeGreaterThanOrEqual(RUAS_ENTRE_FURADAS);
  });

  it('um sorteio barrado pela distância não gasta a chance do ciclo', () => {
    let chamadas = 0;
    const resultado = sortearRuaQueFura({
      indiceDoJogador: 3,
      ultimaOrdem: ordemDaRua(2),
      chance: 1,
      aleatorio: () => {
        chamadas += 1;
        return SEMPRE_PASSA;
      },
    });
    expect(resultado).toBeNull();
    expect(chamadas).toBe(0);
  });

  it('devolve a ordem da rua escolhida, para alimentar a próxima chamada', () => {
    const primeira = sortearRuaQueFura({
      indiceDoJogador: 0,
      ultimaOrdem: -Infinity,
      chance: 1,
      aleatorio: aleatorioFixo(SEMPRE_PASSA, 0),
    });
    expect(primeira.ordem).toBe(ordemDaRua(primeira.rua));

    // Encadeando: a mesma rua não pode ser escolhida de novo em seguida.
    const segunda = sortearRuaQueFura({
      indiceDoJogador: primeira.rua,
      ultimaOrdem: primeira.ordem,
      chance: 1,
      aleatorio: aleatorioFixo(SEMPRE_PASSA, 0),
    });
    if (segunda) expect(segunda.rua).not.toBe(primeira.rua);
  });

  // Simulação longa: garante que a regra do intervalo se sustenta ao longo de
  // uma partida inteira, e não só numa chamada isolada.
  it('mantém pelo menos 3 ruas entre furadas ao longo de muitas travessias', () => {
    let ultimaOrdem = -Infinity;
    const ordens = [];

    for (let indice = 0; indice < 300; indice += 3) {
      const resultado = sortearRuaQueFura({
        indiceDoJogador: indice,
        ultimaOrdem,
        chance: 1, // pior caso: sempre que puder, fura
        aleatorio: aleatorioFixo(SEMPRE_PASSA, 0),
      });
      if (resultado) {
        ordens.push(resultado.ordem);
        ultimaOrdem = resultado.ordem;
      }
    }

    expect(ordens.length).toBeGreaterThan(20);
    for (let i = 1; i < ordens.length; i++) {
      expect(ordens[i] - ordens[i - 1]).toBeGreaterThanOrEqual(RUAS_ENTRE_FURADAS);
    }
  });
});
