import { useEffect, useMemo, useState } from 'react';
import { PATTERN, SEGMENT_HEIGHT } from '../gameGrid';
import banco from '../../../assets/banco.png';
import hidrante from '../../../assets/hidrante.png';
import nitbike from '../../../assets/nitbike.png';
import pontoOnibus from '../../../assets/ponto_de_onibus.png';
import pombo1 from '../../../assets/pombo1.png';
import pombo2 from '../../../assets/pombo2.png';
import pombo3 from '../../../assets/pombo3.png';
import cachorro1 from '../../../assets/cachorro1.png';
import cachorro2 from '../../../assets/cachorro2.png';
import cachorro3 from '../../../assets/cachorro3.png';
import gato1 from '../../../assets/gato1.png';
import gato2 from '../../../assets/gato2.png';
import gato3 from '../../../assets/gato3.png';
import homemEspera1 from '../../../assets/homemEspera1.png';
import homemEspera2 from '../../../assets/homemEspera2.png';
import homemEspera3 from '../../../assets/homemEspera3.png';

// Vai-e-volta como o ciclo de caminhada do pedestre: o quadro do meio é
// reaproveitado na volta. Os três quadros de cada bicho compartilham o mesmo
// recorte, então o corpo fica parado e só a parte que anima se mexe.
const CICLO_POMBO = [pombo1, pombo2, pombo3, pombo2];
const CICLO_CACHORRO = [cachorro1, cachorro2, cachorro3, cachorro2];
const CICLO_GATO = [gato1, gato2, gato3, gato2];
const MS_POR_QUADRO = 190;

// O homem no ponto não pisca como um bicho: ele ESPERA. A espera é feita
// repetindo o quadro parado dentro da própria sequência — mesmo truque que o
// Vehicle usa para pesar o sorteio de tipo sem escrever um gerador ponderado.
// A 500ms por quadro, o ciclo inteiro leva 14 segundos: fica parado 5s, olha
// a rua 1,5s, volta a esperar 4,5s, confere o relógio 2s e recomeça.
const MS_DO_HOMEM = 500;
const paradoPor = (vezes) => Array(vezes).fill(homemEspera1);
const CICLO_HOMEM = [
  ...paradoPor(10),
  homemEspera2, homemEspera2, homemEspera2,
  ...paradoPor(9),
  homemEspera3, homemEspera3, homemEspera3, homemEspera3,
  ...paradoPor(2),
];

// --- PEÇAS ---
//
// Alturas escolhidas por peça; a largura sai da proporção real do arquivo
// para o sprite não esticar. Antes o banco era desenhado em 90x45 (2.0)
// sendo que a arte é 71x49 (1.45), e o hidrante em 40x40 sendo 43x54.
//
// `vivo` é bicho ou gente: vira para qualquer lado e fica fora da linha exata
// em que o mobiliário se apoia.
function comLargura(peca) {
  return {
    ...peca,
    largura: Math.round(peca.altura * peca.proporcao),
    ...(peca.acompanhante ? { acompanhante: comLargura(peca.acompanhante) } : {}),
  };
}

const BANCO = comLargura({ src: banco, altura: 40, proporcao: 71 / 49 });
// A arte nova já vem no tamanho em que é desenhada (31x44), então a
// proporção rende largura 31 e o sprite sai 1:1, sem o navegador descartar
// linha nenhuma. A anterior era 43x54 desenhada a 44 de altura.
const HIDRANTE = comLargura({ src: hidrante, altura: 44, proporcao: 31 / 44 });
const NITBIKE = comLargura({ src: nitbike, altura: 73, proporcao: 88 / 72 });

const PONTO_DE_ONIBUS = comLargura({
  src: pontoOnibus,
  altura: 72,
  proporcao: 86 / 55,
  // `acompanhante` é quem não existe sozinho: quem espera o ônibus espera NO
  // ponto, então o homem é parte do abrigo, desenhado por cima e um pouco à
  // frente dele. Sem isso ele aparecia esperando ônibus no meio da quadra.
  acompanhante: {
    quadros: CICLO_HOMEM,
    altura: 70,
    proporcao: 29 / 74,
    msPorQuadro: MS_DO_HOMEM,
    // Encostado no montante direito do abrigo, dentro da largura dele. A base
    // desce 4px: é o que faz ele ler como estando NA FRENTE do abrigo, e não
    // dentro da parede.
    deslocamentoX: 76,
    deslocamentoY: 4,
    // Sempre virado para a esquerda: é de lá que os veículos vêm (a animação
    // `drive` corre da esquerda para a direita), então é para lá que olha
    // quem espera o ônibus.
    espelhado: true,
  },
});

const POMBO = comLargura({ quadros: CICLO_POMBO, altura: 20, proporcao: 89 / 82, vivo: true });
const CACHORRO = comLargura({ quadros: CICLO_CACHORRO, altura: 27, proporcao: 32 / 28, vivo: true, msPorQuadro: 130 });
const GATO = comLargura({ quadros: CICLO_GATO, altura: 26, proporcao: 28 / 33, vivo: true, msPorQuadro: 320 });

// --- CONJUNTOS ---
//
// A vaga da calçada recebe um conjunto inteiro, e não uma peça solta. É aqui
// que ficam as regras de quem anda com quem:
//
//   - cachorro aparece junto do hidrante ou do ponto de ônibus;
//   - gato, junto do banco ou do ponto de ônibus;
//   - nenhum dos dois é obrigatório: móvel sozinho é conjunto como qualquer
//     outro;
//   - cachorro e gato nunca saem no mesmo grupo — cada conjunto tem no máximo
//     um bicho de estimação;
//   - pombo nunca aparece sozinho, só em bando de 2 ou 3.
//
// A ordem aqui não fixa o lado: montarConjunto inverte o grupo em metade dos
// sorteios, então o bicho cai ora à esquerda, ora à direita do móvel.
//
// Repetir uma entrada é o jeito simples de pesar o sorteio, o mesmo usado nos
// tipos de veículo: sem as repetições abaixo, o ponto de ônibus — que tem três
// variações — apareceria o dobro do banco.
const CONJUNTOS = [
  [BANCO],
  [BANCO],
  [BANCO, GATO],
  [HIDRANTE],
  [HIDRANTE],
  [HIDRANTE, CACHORRO],
  [NITBIKE],
  [NITBIKE],
  [PONTO_DE_ONIBUS],
  [PONTO_DE_ONIBUS, CACHORRO],
  [PONTO_DE_ONIBUS, GATO],
  [POMBO, POMBO],
  [POMBO, POMBO, POMBO],
];

// Espaço entre duas peças do mesmo conjunto. Pequeno de propósito: elas
// precisam ler como um grupo, não como dois itens que calharam de cair perto.
const FOLGA_NO_CONJUNTO = 5;

function larguraDoConjunto(conjunto) {
  return (
    conjunto.reduce((soma, peca) => soma + peca.largura, 0) +
    FOLGA_NO_CONJUNTO * (conjunto.length - 1)
  );
}

// Os itens são centralizados na faixa da calçada. Sem compensar, um sprite
// baixo (o pombo) flutuaria acima da base dos outros: todos apoiam nesta
// linha de chão. O valor é fixo de propósito — se fosse o item mais alto,
// crescer o abrigo do ponto de ônibus arrastaria a calçada inteira para
// baixo. Quem é mais alto que a referência cresce para cima.
//
// Daí sai uma altura máxima: acima dela o topo do sprite vaza do segmento e
// aparece por cima do asfalto. É o teto do abrigo do ponto e da nitbike.
const ALTURA_DE_APOIO = 46;
const ALTURA_MAXIMA = ALTURA_DE_APOIO / 2 + SEGMENT_HEIGHT / 2;

// Quanto quem está vivo pode subir ou descer na calçada a partir dessa linha.
// Fica bem abaixo da metade da faixa de mosaico, senão o pombo encostaria na
// grade.
const DESVIO_Y = 8;

// Subir os 8px inteiros só é seguro para sprite baixo: no homem, que já está
// quase no teto, o desvio para cima é aparado até onde a cabeça ainda cabe no
// segmento. Para baixo o limite continua sendo o mosaico.
function sortearDesvioY(peca, aleatorio) {
  const minimo = Math.max(-DESVIO_Y, peca.altura - ALTURA_MAXIMA);
  return Math.round(minimo + aleatorio() * (DESVIO_Y - minimo));
}

// Posições seguras: longe do corredor central por onde o jogador anda e da
// faixa de pedestres. O conjunto é ancorado pela esquerda nessa coordenada.
const POSICOES = [42, 104, 452, 514];

// Coordenadas internas da arena (as mesmas 600x400 do GameArena). O abrigo do
// ponto de ônibus é largo o bastante para vazar pela borda direita ou para
// invadir a vaga vizinha — 42 e 104 estão a só 62px de distância.
const LARGURA_ARENA = 600;
const MARGEM_BORDA = 8;
const FOLGA_ENTRE_CONJUNTOS = 6;

// Sorteio semeado pelo índice da calçada, em vez de Math.random no mount.
// Resolve três coisas de uma vez: a calçada não se reembaralha quando o
// jogador anda para longe e volta (o segmento desmonta e remonta); o
// StrictMode, que renderiza duas vezes em dev, produz o mesmo resultado; e —
// o principal — dá para perguntar o que a calçada ANTERIOR sorteou e evitar
// repetir o mesmo conjunto em ruas seguidas. A semente da sessão mantém a
// variedade de uma partida para a outra.
const SEMENTE_DA_SESSAO = Math.floor(Math.random() * 2 ** 31);

// mulberry32: gerador pequeno e determinístico, bom o bastante para enfeite.
function geradorAleatorio(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates de verdade. O `sort(() => aleatorio() - 0.5)` que estava aqui
// não distribui as permutações por igual: algumas posições saíam bem mais
// que outras, o que já era parte da sensação de repetição.
function embaralhar(itens, aleatorio) {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Distribui as peças do conjunto lado a lado e decide como cada uma aparece.
function montarConjunto(conjunto, aleatorio) {
  // Metade dos sorteios inverte o grupo. É o que impede o bicho de nascer
  // sempre do mesmo lado do móvel: o cachorro cai ora antes, ora depois do
  // hidrante, sem precisar de uma entrada no catálogo para cada ordem.
  const ordenado = aleatorio() < 0.5 ? conjunto : [...conjunto].reverse();

  let x = 0;
  return ordenado.map((peca) => {
    const colocada = {
      peca,
      deslocamentoX: x,
      // Sorteado aqui junto com o conjunto: no corpo do componente, cada passo
      // do jogador viraria quem está vivo do avesso e o faria pular pela
      // calçada.
      espelhado: Boolean(peca.vivo) && aleatorio() < 0.5,
      desvioY: peca.vivo ? sortearDesvioY(peca, aleatorio) : 0,
    };
    x += peca.largura + FOLGA_NO_CONJUNTO;
    return colocada;
  });
}

function sortearDecoracoes(aleatorio, conjuntosDaAnterior) {
  const quantidade = 1 + Math.floor(aleatorio() * 3); // 1 a 3 por calçada
  const vagas = embaralhar(POSICOES, aleatorio)
    .slice(0, quantidade)
    .sort((a, b) => a - b); // da esquerda para a direita, para saber quem é vizinho

  const pecasUsadas = new Set();
  const decoracoes = [];
  let bordaOcupada = 0; // até onde o conjunto anterior se estende

  for (const posX of vagas) {
    if (posX < bordaOcupada) continue; // vaga engolida por um conjunto largo

    const opcoes = CONJUNTOS.filter(
      (conjunto) =>
        // Peça é única por calçada: dois bancos ou dois hidrantes na mesma
        // quadra entregam o sorteio, e vale também entre conjuntos diferentes
        // — [BANCO] e [BANCO, GATO] não podem sair na mesma calçada.
        conjunto.every((peca) => !pecasUsadas.has(peca)) &&
        posX + larguraDoConjunto(conjunto) <= LARGURA_ARENA - MARGEM_BORDA
    );
    if (opcoes.length === 0) continue;

    // Preferência (não regra) por quem não apareceu na calçada anterior:
    // sortear cada calçada isolada põe o mesmo conjunto em ruas seguidas com
    // frequência. Se sobrar nada, o sorteio volta a considerar tudo em vez de
    // deixar a vaga vazia.
    const ineditos = opcoes.filter((conjunto) => !conjuntosDaAnterior.includes(conjunto));
    const lista = ineditos.length > 0 ? ineditos : opcoes;

    const conjunto = lista[Math.floor(aleatorio() * lista.length)];
    conjunto.forEach((peca) => pecasUsadas.add(peca));
    bordaOcupada = posX + larguraDoConjunto(conjunto) + FOLGA_ENTRE_CONJUNTOS;

    decoracoes.push({ posX, conjunto, pecas: montarConjunto(conjunto, aleatorio) });
  }

  return decoracoes;
}

// As calçadas ficam a cada PATTERN.length segmentos, e a de índice mais baixo
// que chega a ser renderizada é a -3 (RENDER_BEHIND do GameArena), onde a
// corrente para por não haver anterior.
const PASSO_ENTRE_CALCADAS = PATTERN.length;
const PRIMEIRA_CALCADA = -PASSO_ENTRE_CALCADAS;

// Uma entrada por calçada visitada. O teto evita crescer sem limite numa
// partida longa; reconstruir uma entrada descartada dá o mesmo resultado,
// já que tudo vem da semente.
const LIMITE_DO_CACHE = 240;
const cache = new Map();

function decoracoesDaCalcada(indice) {
  const guardado = cache.get(indice);
  if (guardado) return guardado;

  const anterior = indice > PRIMEIRA_CALCADA ? decoracoesDaCalcada(indice - PASSO_ENTRE_CALCADAS) : [];
  const sorteio = sortearDecoracoes(
    geradorAleatorio(SEMENTE_DA_SESSAO + indice),
    anterior.map((decoracao) => decoracao.conjunto)
  );

  cache.set(indice, sorteio);
  if (cache.size > LIMITE_DO_CACHE) cache.delete(cache.keys().next().value);
  return sorteio;
}

function Sprite({ item, espelhado }) {
  // Começa num quadro qualquer para que dois pombos do mesmo bando não biquem
  // em uníssono.
  const [quadro, setQuadro] = useState(() =>
    item.quadros ? Math.floor(Math.random() * item.quadros.length) : 0
  );

  useEffect(() => {
    if (!item.quadros) return undefined;
    // Decoração é enfeite, não jogabilidade: quem pede menos movimento no
    // sistema fica com bichos e gente parados, igual às piscadas do App.css.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const intervalo = setInterval(() => {
      setQuadro((atual) => (atual + 1) % item.quadros.length);
    }, item.msPorQuadro ?? MS_POR_QUADRO);
    return () => clearInterval(intervalo);
  }, [item.quadros, item.msPorQuadro]);

  return (
    <img
      src={item.quadros ? item.quadros[quadro] : item.src}
      alt=""
      style={{
        display: 'block',
        width: `${item.largura}px`,
        height: `${item.altura}px`,
        // A sombra só desce, então espelhar não a deixa caindo para o lado errado.
        transform: espelhado ? 'scaleX(-1)' : undefined,
        filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.3))',
      }}
    />
  );
}

export default function SidewalkDecoration({ indice }) {
  // O componente re-renderiza a cada passo do jogador (a cena inteira se
  // move), então o sorteio precisa ficar fora do corpo — senão a decoração
  // trocaria de item e de lugar a cada quadro. O resultado vem do índice da
  // calçada, não do mount, então é sempre o mesmo para o mesmo trecho da rua.
  const decoracoes = useMemo(() => decoracoesDaCalcada(indice), [indice]);

  return (
    <>
      {decoracoes.map(({ posX, pecas }) => (
        <div
          key={posX}
          className="sidewalk-decoration"
          style={{
            position: 'absolute',
            left: `${posX}px`,
            top: '50%',
            // Âncora na linha do chão do conjunto: as peças se penduram nela
            // pela base, cada uma com a própria altura.
            transform: `translateY(${ALTURA_DE_APOIO / 2}px)`,
            pointerEvents: 'none',
          }}
        >
          {pecas.map(({ peca, deslocamentoX, espelhado, desvioY }, ordem) => (
            <div
              key={ordem}
              style={{
                position: 'absolute',
                left: `${deslocamentoX}px`,
                bottom: `${-desvioY}px`,
              }}
            >
              <Sprite item={peca} espelhado={espelhado} />
              {peca.acompanhante && (
                // Depois do sprite principal na ordem do DOM, então é
                // desenhado por cima dele — que é o que "na frente do ponto"
                // quer dizer.
                <div
                  style={{
                    position: 'absolute',
                    left: `${peca.acompanhante.deslocamentoX}px`,
                    bottom: `${-peca.acompanhante.deslocamentoY}px`,
                  }}
                >
                  <Sprite item={peca.acompanhante} espelhado={peca.acompanhante.espelhado} />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
