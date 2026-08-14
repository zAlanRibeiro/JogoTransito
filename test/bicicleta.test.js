import { describe, it, expect } from 'vitest';
import {
  chanceDeBicicleta,
  sortearBicicleta,
  criarSorteadorDeCiclovias,
  ruaAceitaCiclovia,
  CHANCE_ANTES_DO_PRAZO,
  CHANCE_NO_PRAZO,
  RUAS_ATE_A_CHANCE_CHEIA,
} from '../src/features/TravessiaSegura/bicicleta';
import { ordemDaRua, segmentType } from '../src/features/TravessiaSegura/gameGrid';

describe('chanceDeBicicleta', () => {
  it('fica em 1% enquanto não completar 20 ruas desde a última', () => {
    for (const ruas of [0, 1, 5, 19]) {
      expect(chanceDeBicicleta(ruas)).toBe(CHANCE_ANTES_DO_PRAZO);
    }
  });

  it('vira 20% exatamente na 20ª rua', () => {
    expect(chanceDeBicicleta(RUAS_ATE_A_CHANCE_CHEIA)).toBeCloseTo(CHANCE_NO_PRAZO, 10);
  });

  it('sobe 10 pontos a cada 10 ruas depois disso', () => {
    expect(chanceDeBicicleta(29)).toBeCloseTo(0.2, 10);
    expect(chanceDeBicicleta(30)).toBeCloseTo(0.3, 10);
    expect(chanceDeBicicleta(39)).toBeCloseTo(0.3, 10);
    expect(chanceDeBicicleta(40)).toBeCloseTo(0.4, 10);
    expect(chanceDeBicicleta(100)).toBeCloseTo(1, 10);
  });

  it('nunca passa de 100%', () => {
    expect(chanceDeBicicleta(500)).toBe(1);
  });

  it('nunca anda para trás', () => {
    let anterior = 0;
    for (let ruas = 0; ruas <= 200; ruas++) {
      const atual = chanceDeBicicleta(ruas);
      expect(atual).toBeGreaterThanOrEqual(anterior);
      anterior = atual;
    }
  });
});

describe('sortearBicicleta', () => {
  it('respeita a chance da distância percorrida', () => {
    // 10 ruas depois da última: só passa quem tirar menos de 0,01.
    expect(sortearBicicleta({ ordem: 10, ultimaOrdem: 0, aleatorio: () => 0.009 })).toBe(true);
    expect(sortearBicicleta({ ordem: 10, ultimaOrdem: 0, aleatorio: () => 0.011 })).toBe(false);

    // 20 ruas depois: 0,15 já passa.
    expect(sortearBicicleta({ ordem: 20, ultimaOrdem: 0, aleatorio: () => 0.15 })).toBe(true);
  });

  it('conta a distância a partir da última bicicleta, e não do começo do jogo', () => {
    // Rua 100 do trajeto, mas a última bicicleta foi na 95: ainda é 1%.
    expect(sortearBicicleta({ ordem: 100, ultimaOrdem: 95, aleatorio: () => 0.15 })).toBe(false);
    // Mesma rua 100, última bicicleta lá atrás na 60: chance cheia de 40%.
    expect(sortearBicicleta({ ordem: 100, ultimaOrdem: 60, aleatorio: () => 0.15 })).toBe(true);
  });

  // O que a regra promete na prática: bicicleta é rara, mas nunca deixa de
  // ser possível, e a espera não se arrasta para sempre.
  it('ao longo de uma partida longa, mantém as bicicletas espaçadas', () => {
    let ultimaOrdem = 0;
    const intervalos = [];
    // Gerador determinístico simples, para o teste não depender de sorte.
    let semente = 42;
    const aleatorio = () => {
      semente = (semente * 1103515245 + 12345) % 2147483648;
      return semente / 2147483648;
    };

    for (let ordem = 1; ordem <= 2000; ordem++) {
      if (sortearBicicleta({ ordem, ultimaOrdem, aleatorio })) {
        intervalos.push(ordem - ultimaOrdem);
        ultimaOrdem = ordem;
      }
    }

    expect(intervalos.length).toBeGreaterThan(10);
    const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
    // Na média espera-se algo em torno de 20 e poucas ruas: nem toda travessia,
    // nem uma vez por partida.
    expect(media).toBeGreaterThan(12);
    expect(media).toBeLessThan(40);
  });
});

describe('ruaAceitaCiclovia', () => {
  // O trajeto é calçada, rua, rua, calçada, rua, rua... (PATTERN). Só a
  // PRIMEIRA rua de cada par encosta na calçada de onde o jogador sai — é
  // nela, e só nela, que a ciclovia pode cair.
  it('aceita a rua que encosta na calçada e recusa a de dentro', () => {
    expect(ruaAceitaCiclovia(1)).toBe(true);
    expect(ruaAceitaCiclovia(2)).toBe(false);
    expect(ruaAceitaCiclovia(4)).toBe(true);
    expect(ruaAceitaCiclovia(5)).toBe(false);
    expect(ruaAceitaCiclovia(7)).toBe(true);
  });

  it('recusa calçada', () => {
    for (const calcada of [0, 3, 6, 9]) {
      expect(segmentType(calcada)).toBe('calcada');
      expect(ruaAceitaCiclovia(calcada)).toBe(false);
    }
  });
});

describe('criarSorteadorDeCiclovias', () => {
  it('responde sempre a mesma coisa para o mesmo segmento', () => {
    const temCiclovia = criarSorteadorDeCiclovias();
    const primeiraLeitura = [];
    for (let i = 0; i <= 60; i++) primeiraLeitura.push(temCiclovia(i));

    // De novo, em ordem embaralhada: é isso que o render faz, perguntando
    // pelos segmentos visíveis em qualquer ordem, várias vezes.
    for (const i of [17, 3, 60, 42, 1, 29]) {
      expect(temCiclovia(i)).toBe(primeiraLeitura[i]);
    }
  });

  it('perguntar por um segmento distante não muda as respostas dos anteriores', () => {
    const semSalto = criarSorteadorDeCiclovias(aleatorioDeTeste());
    const comSalto = criarSorteadorDeCiclovias(aleatorioDeTeste());

    const esperado = [];
    for (let i = 0; i <= 50; i++) esperado.push(semSalto(i));

    // O segundo pula direto para o segmento 50 e só depois volta aos anteriores.
    comSalto(50);
    for (let i = 0; i <= 50; i++) {
      expect(comSalto(i)).toBe(esperado[i]);
    }
  });

  it('nunca põe ciclovia em calçada nem na rua de dentro do par', () => {
    const temCiclovia = criarSorteadorDeCiclovias(() => 0); // sorteio sempre passa
    expect(temCiclovia(0)).toBe(false); // calçada
    expect(temCiclovia(-3)).toBe(false); // antes do começo do trajeto
    expect(temCiclovia(1)).toBe(true); // rua encostada na calçada
    expect(temCiclovia(2)).toBe(false); // rua de dentro
    expect(temCiclovia(3)).toBe(false); // calçada
    expect(temCiclovia(4)).toBe(true);
  });

  it('zera a contagem a cada bicicleta: a próxima volta a exigir sorte de 1%', () => {
    // Sorteio que passa em 1% (0,005) só na primeira chamada; nas seguintes
    // devolve 0,05 — o bastante para 20%, mas não para 1%.
    let chamada = 0;
    const temCiclovia = criarSorteadorDeCiclovias(() => (chamada++ === 0 ? 0.005 : 0.05));

    expect(temCiclovia(1)).toBe(true);

    // A contagem recomeçou: enquanto não passarem 20 ruas, a chance é de 1%
    // e 0,05 não passa. O segmento 28 é a 19ª rua do trajeto.
    for (let i = 2; i <= 28; i++) expect(temCiclovia(i)).toBe(false);

    // O segmento 31 é a 21ª rua: 20 ruas depois da primeira, já com 20% de
    // chance — e é uma rua encostada na calçada, então recebe a ciclovia.
    expect(ordemDaRua(31)).toBe(21);
    expect(temCiclovia(31)).toBe(true);
  });

  it('a rua de dentro não gasta o sorteio da vez', () => {
    let sorteios = 0;
    const temCiclovia = criarSorteadorDeCiclovias(() => {
      sorteios += 1;
      return 0.99; // nunca passa
    });

    // Segmentos 0 a 6: duas ruas encostadas na calçada (1 e 4), duas de
    // dentro (2 e 5) e três calçadas. Só as duas primeiras sorteiam.
    for (let i = 0; i <= 6; i++) temCiclovia(i);
    expect(sorteios).toBe(2);
  });
});

/** Gerador determinístico, para dois sorteadores seguirem o mesmo caminho. */
function aleatorioDeTeste() {
  let semente = 7;
  return () => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente / 2147483648;
  };
}
