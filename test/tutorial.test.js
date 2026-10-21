import { describe, it, expect } from 'vitest';
import { PASSOS, noTrecho, naTrajetoria } from '../src/features/TravessiaSegura/tutorial';

describe('naTrajetoria', () => {
  const pontos = [[1000, 0, 100], [3000, 200, 100], [3000, 50, 300], [4000, 50, 300]];

  it('fica parada na ponta antes do primeiro ponto e depois do último', () => {
    expect(naTrajetoria(pontos, 0)).toEqual({ valores: [0, 100], andando: false });
    expect(naTrajetoria(pontos, 9000)).toEqual({ valores: [50, 300], andando: false });
  });

  it('interpola em linha reta e marca que está andando', () => {
    expect(naTrajetoria(pontos, 2000)).toEqual({ valores: [100, 100], andando: true });
  });

  it('dois pontos no mesmo instante são um corte, sem passar pelo meio', () => {
    expect(naTrajetoria(pontos, 2999).valores[1]).toBe(100);
    expect(naTrajetoria(pontos, 3000)).toEqual({ valores: [50, 300], andando: false });
  });
});

describe('noTrecho', () => {
  it('devolve o trecho que ainda não acabou, e o último no fim', () => {
    const sinal = [[4000, 'green'], [5500, 'yellow'], [10000, 'red']];
    expect(noTrecho(sinal, 0)).toBe('green');
    expect(noTrecho(sinal, 4000)).toBe('yellow');
    expect(noTrecho(sinal, 9999)).toBe('red');
    expect(noTrecho(sinal, 10000)).toBe('red');
  });
});

describe('PASSOS', () => {
  const trechosDe = (passo) => [passo.sinal, passo.legendas, passo.vidas].filter(Boolean);
  const trajetoriasDe = (passo) => [
    passo.boneco.pontos,
    passo.guarda?.pontos,
    passo.bicicleta?.pontos,
    ...passo.veiculos.map((v) => v.pontos),
  ].filter(Boolean);

  it.each(PASSOS.map((passo) => [passo.titulo, passo]))('"%s": trechos em ordem e cobrindo a cena inteira', (_, passo) => {
    for (const trechos of trechosDe(passo)) {
      const fins = trechos.map(([ate]) => ate);
      expect(fins).toEqual([...fins].sort((a, b) => a - b));
      expect(fins.at(-1)).toBe(passo.duracao);
    }
    expect(passo.legendas.every(([, texto]) => texto.trim().length > 0)).toBe(true);
  });

  it.each(PASSOS.map((passo) => [passo.titulo, passo]))('"%s": trajetórias em ordem e dentro da duração', (_, passo) => {
    for (const pontos of trajetoriasDe(passo)) {
      const tempos = pontos.map(([t]) => t);
      expect(tempos).toEqual([...tempos].sort((a, b) => a - b));
      expect(tempos.every((t) => t >= 0 && t <= passo.duracao)).toBe(true);
    }
  });
});
