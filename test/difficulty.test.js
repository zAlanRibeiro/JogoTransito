import { describe, it, expect } from 'vitest';
import { calcularDificuldade } from '../src/features/TravessiaSegura/difficulty';

describe('calcularDificuldade', () => {
  it('começa no nível 0', () => {
    expect(calcularDificuldade(0).nivel).toBe(0);
    expect(calcularDificuldade(29).nivel).toBe(0);
  });

  it('sobe de nível a cada 30 pontos', () => {
    expect(calcularDificuldade(30).nivel).toBe(1);
    expect(calcularDificuldade(59).nivel).toBe(1);
    expect(calcularDificuldade(60).nivel).toBe(2);
  });

  // Sem teto o jogo viraria impossível numa partida longa (a pista é
  // infinita, então a pontuação não para de subir).
  it('para de subir no nível 8, por maior que seja a pontuação', () => {
    expect(calcularDificuldade(240).nivel).toBe(8);
    expect(calcularDificuldade(1000).nivel).toBe(8);
    expect(calcularDificuldade(999999).nivel).toBe(8);
  });

  it('trata pontuação negativa como zero', () => {
    expect(calcularDificuldade(-50).nivel).toBe(0);
  });

  it('fica mais difícil conforme o nível sobe', () => {
    const inicio = calcularDificuldade(0);
    const fim = calcularDificuldade(240);
    expect(fim.duracaoVerde).toBeLessThan(inicio.duracaoVerde);
    expect(fim.duracaoVermelho).toBeLessThan(inicio.duracaoVermelho);
    expect(fim.duracaoCarro).toBeLessThan(inicio.duracaoCarro);
  });

  it('nunca fecha o sinal a ponto de não dar para atravessar', () => {
    for (let pontos = 0; pontos <= 1000; pontos += 10) {
      const d = calcularDificuldade(pontos);
      // O jogador leva ~1s para cruzar as duas pistas; 3s é o piso seguro.
      expect(d.duracaoVermelho).toBeGreaterThanOrEqual(3);
      expect(d.duracaoVerde).toBeGreaterThanOrEqual(3);
      expect(d.duracaoCarro).toBeGreaterThanOrEqual(2);
    }
  });

  // O cronômetro do HUD conta de segundo em segundo: valor fracionado
  // apareceria quebrado na tela.
  it('devolve durações de sinal inteiras', () => {
    for (let pontos = 0; pontos <= 300; pontos += 15) {
      const d = calcularDificuldade(pontos);
      expect(Number.isInteger(d.duracaoVerde)).toBe(true);
      expect(Number.isInteger(d.duracaoVermelho)).toBe(true);
    }
  });

  it('é uma função pura: mesma entrada, mesma saída', () => {
    expect(calcularDificuldade(75)).toEqual(calcularDificuldade(75));
  });
});
