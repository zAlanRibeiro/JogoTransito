import { describe, it, expect } from 'vitest';
import {
  SEGMENT_HEIGHT,
  CYCLE_LENGTH,
  CROSSWALK_WIDTH,
  properMod,
  mod3,
  segmentType,
  crosswalkIndexFor,
  estaNaCalcadaComMargem,
  ordemDaRua,
} from '../src/features/TravessiaSegura/gameGrid';

describe('properMod', () => {
  it('se comporta como % para valores positivos', () => {
    expect(properMod(7, 3)).toBe(1);
    expect(properMod(300, 300)).toBe(0);
  });

  // O % nativo do JS preserva o sinal do dividendo (-10 % 300 === -10), o
  // que quebrava as comparações de limite quando o jogador andava para trás
  // e o Y ficava negativo.
  it('devolve resultado positivo para valores negativos', () => {
    expect(properMod(-10, 300)).toBe(290);
    expect(properMod(-300, 300)).toBe(0);
    expect(properMod(-301, 300)).toBe(299);
  });
});

describe('segmentType', () => {
  it('segue o padrão calçada, rua, rua', () => {
    expect(segmentType(0)).toBe('calcada');
    expect(segmentType(1)).toBe('rua');
    expect(segmentType(2)).toBe('rua');
    expect(segmentType(3)).toBe('calcada');
  });

  it('mantém o padrão em índices negativos', () => {
    expect(segmentType(-1)).toBe('rua');
    expect(segmentType(-2)).toBe('rua');
    expect(segmentType(-3)).toBe('calcada');
  });
});

describe('crosswalkIndexFor', () => {
  // A faixa é ancorada na rua "de longe" de cada par (mod3 === 2) e cobre as
  // duas ruas. Quem está na calçada mira o próximo par; quem já está numa
  // rua mira a faixa do próprio par — nunca uma mais à frente.
  it('na calçada, aponta para a faixa do próximo par', () => {
    expect(crosswalkIndexFor(0)).toBe(2);
    expect(crosswalkIndexFor(3)).toBe(5);
  });

  it('na rua de perto, aponta para a faixa do próprio par', () => {
    expect(crosswalkIndexFor(1)).toBe(2);
    expect(crosswalkIndexFor(4)).toBe(5);
  });

  it('na rua de longe, a faixa é o próprio segmento', () => {
    expect(crosswalkIndexFor(2)).toBe(2);
    expect(crosswalkIndexFor(5)).toBe(5);
  });

  it('sempre aponta para um segmento que ancora faixa', () => {
    for (let i = -6; i <= 12; i++) {
      expect(mod3(crosswalkIndexFor(i))).toBe(2);
    }
  });
});

describe('estaNaCalcadaComMargem', () => {
  // Esta margem existe para compensar o tamanho do sprite do jogador. Ela
  // precisa ser a MESMA usada pela regra de movimento e pela regra de
  // punição: quando as duas divergiam, o jogador era penalizado por "estar
  // na rua" já estando visualmente seguro na calçada.
  it('reconhece o começo e o fim do ciclo como calçada', () => {
    expect(estaNaCalcadaComMargem(0)).toBe(true);
    expect(estaNaCalcadaComMargem(85)).toBe(true);
    expect(estaNaCalcadaComMargem(235)).toBe(true);
    expect(estaNaCalcadaComMargem(299)).toBe(true);
  });

  it('reconhece o miolo do ciclo como rua', () => {
    expect(estaNaCalcadaComMargem(86)).toBe(false);
    expect(estaNaCalcadaComMargem(150)).toBe(false);
    expect(estaNaCalcadaComMargem(234)).toBe(false);
  });

  it('vale para qualquer ciclo, inclusive negativo', () => {
    expect(estaNaCalcadaComMargem(300)).toBe(true);
    expect(estaNaCalcadaComMargem(450)).toBe(false);
    expect(estaNaCalcadaComMargem(-10)).toBe(true);
    expect(estaNaCalcadaComMargem(-150)).toBe(false);
  });

  // Regressão: a zona 235-300 é rua pelo segmento bruto mas calçada pela
  // margem. Era exatamente aí que o jogador levava punição indevida.
  it('considera calçada a faixa que o segmento bruto ainda chama de rua', () => {
    const y = 256;
    expect(segmentType(Math.floor(y / SEGMENT_HEIGHT))).toBe('rua');
    expect(estaNaCalcadaComMargem(y)).toBe(true);
  });
});

describe('constantes do tabuleiro', () => {
  it('mantêm a relação que o resto do código assume', () => {
    expect(CYCLE_LENGTH).toBe(SEGMENT_HEIGHT * 3);
    // Precisa bater com a largura de .crosswalk no App.css.
    expect(CROSSWALK_WIDTH).toBe(110);
  });
});

describe('ordemDaRua', () => {
  // O padrão é calçada, rua, rua: as ruas ficam nos índices 1, 2, 4, 5, 7, 8...
  it('numera as ruas em sequência, ignorando as calçadas', () => {
    expect(ordemDaRua(1)).toBe(1);
    expect(ordemDaRua(2)).toBe(2);
    expect(ordemDaRua(4)).toBe(3);
    expect(ordemDaRua(5)).toBe(4);
    expect(ordemDaRua(7)).toBe(5);
    expect(ordemDaRua(8)).toBe(6);
  });

  it('cresce de um em um por rua percorrida', () => {
    const ruas = [];
    for (let i = 0; i < 60; i++) {
      if (segmentType(i) === 'rua') ruas.push(ordemDaRua(i));
    }
    for (let i = 1; i < ruas.length; i++) {
      expect(ruas[i] - ruas[i - 1]).toBe(1);
    }
  });

  // O jogador começa em Y=0 e o tabuleiro renderiza segmentos atrás dele, com
  // índice negativo: a numeração precisa continuar monotônica ali também,
  // senão a regra de intervalo do carro que fura o sinal daria distâncias
  // erradas no início da partida.
  it('continua monotônica em índices negativos', () => {
    expect(ordemDaRua(-1)).toBe(0);
    expect(ordemDaRua(-2)).toBe(-1);
    expect(ordemDaRua(-4)).toBe(-2);
    expect(ordemDaRua(-5)).toBe(-3);
  });
});
