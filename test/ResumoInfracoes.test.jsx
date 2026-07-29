import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ResumoInfracoes from '../src/features/TravessiaSegura/components/ResumoInfracoes';
import { INFRACOES_ZERADAS, totalDeInfracoes, totalPorGravidade } from '../src/features/TravessiaSegura/infracoes';

// Renderiza para string em vez de montar num DOM: não precisa de jsdom nem
// de biblioteca de testes de componente, e o resultado é determinístico.
// O caminho "sem nenhuma infração" só aparece numa vitória perfeita, que
// via navegador levaria minutos e ainda dependeria do ciclo do semáforo.
const renderizar = (infracoes) => renderToStaticMarkup(<ResumoInfracoes infracoes={infracoes} />);

describe('ResumoInfracoes', () => {
  it('celebra a partida sem nenhuma infração', () => {
    const html = renderizar(INFRACOES_ZERADAS);
    expect(html).toContain('Nenhuma infração');
    expect(html).not.toContain('Leves');
    expect(html).not.toContain('Pesadas');
  });

  it('mostra só o grupo que teve ocorrência', () => {
    const html = renderizar({ ...INFRACOES_ZERADAS, faixa: 2 });
    expect(html).toContain('Leves');
    expect(html).not.toContain('Pesadas');
    expect(html).not.toContain('Nenhuma infração');
  });

  it('separa leves e pesadas com os totais certos', () => {
    const html = renderizar({
      ...INFRACOES_ZERADAS,
      faixa: 2,        // leve
      sinalAberto: 1,  // leve
      carro: 3,        // pesada
    });
    expect(html).toContain('Leves (tiraram pontos)');
    expect(html).toContain('<strong>3x</strong>'); // total de leves: 2 + 1
    expect(html).toContain('Pesadas (tiraram vida)');
    expect(html).toContain('Atropelamentos');
  });

  it('não lista tipos que não aconteceram', () => {
    const html = renderizar({ ...INFRACOES_ZERADAS, carro: 1 });
    expect(html).toContain('Atropelamentos');
    expect(html).not.toContain('Atravessou fora da faixa');
    expect(html).not.toContain('Perdeu vida sem pontos');
  });
});

describe('contagem de infrações', () => {
  it('soma todas as ocorrências', () => {
    expect(totalDeInfracoes(INFRACOES_ZERADAS)).toBe(0);
    expect(totalDeInfracoes({ ...INFRACOES_ZERADAS, faixa: 2, carro: 3 })).toBe(5);
  });

  // A divisão precisa bater com a usada no banner de aviso durante o jogo:
  // 'leve' só tira pontos, 'grave' tira vida.
  it('agrupa por gravidade sem deixar tipo de fora', () => {
    const umDeCada = { carro: 1, sinalEntrada: 1, sinalAberto: 1, faixa: 1, pontosZerados: 1 };
    const leves = totalPorGravidade(umDeCada, 'leve');
    const pesadas = totalPorGravidade(umDeCada, 'grave');
    expect(leves).toBe(2);
    expect(pesadas).toBe(3);
    expect(leves + pesadas).toBe(totalDeInfracoes(umDeCada));
  });
});
