import nuvemImg from '../../../assets/nuvem.png';
import bonecoParado from '../../../assets/bonecoParado.png';

// A cutscene que fecha a partida quando a última vida acaba. Ela roda por
// cima da arena congelada, em quatro tempos comandados pela GameArena:
//
//   piscando -> o jogo para onde o jogador morreu e ele pisca no lugar
//   nuvens   -> as nuvens entram pelas bordas até tomar a tela inteira
//   ceu      -> as nuvens se abrem e a cena já é o céu, com o fantasma subindo
//   fim      -> o painel de fim de jogo entra por cima do céu
//
// Cada fase é uma classe no elemento raiz, e o movimento é feito com
// TRANSIÇÃO (não com @keyframes): assim cada camada sai de onde estava
// quando a fase virou, sem o pulo que uma animação reiniciada daria.

// A mesma arte de nuvem, repetida em posições, tamanhos e lados de entrada
// diferentes — é o que faz cinco cópias de um PNG só parecerem um céu
// encobrindo a tela. As posições são em % da arena porque a largura dela
// muda com a proporção da tela (ver useArenaResponsiva).
const NUVENS = [
  { lado: 'esquerda', esquerda: '-24%', topo: '-30%', largura: '80%', atraso: 0 },
  { lado: 'direita', esquerda: '44%', topo: '-34%', largura: '86%', atraso: 120 },
  { lado: 'esquerda', esquerda: '-28%', topo: '28%', largura: '94%', atraso: 200 },
  { lado: 'direita', esquerda: '38%', topo: '38%', largura: '98%', atraso: 60 },
  { lado: 'baixo', esquerda: '4%', topo: '2%', largura: '92%', atraso: 260 },
];

// De onde cada nuvem vem (fora da tela) e para onde ela vai quando se abre.
// A saída afasta e AMPLIA a nuvem: dá a sensação de que a câmera atravessou
// o meio delas para chegar ao céu, em vez de as nuvens simplesmente sumirem.
const ENTRADA = {
  esquerda: 'translate(-150%, 14%) scale(1.08)',
  direita: 'translate(150%, 14%) scale(1.08)',
  baixo: 'translate(0, 170%) scale(1.12)',
};

const SAIDA = {
  esquerda: 'translate(-78%, -40%) scale(1.45)',
  direita: 'translate(78%, -36%) scale(1.45)',
  baixo: 'translate(0, 105%) scale(1.5)',
};

export default function CenaDeDerrota({ fase }) {
  const noCeu = fase === 'ceu' || fase === 'fim';

  return (
    // aria-hidden: é cena, não informação. Quem usa leitor de tela recebe o
    // aviso no diálogo de fim de jogo, que entra logo depois.
    <div className={`cena-derrota cena-derrota--${fase}`} aria-hidden="true">
      {/* A arte do céu vem do App.css (como a da tela de vitória): ela é
          fundo com recorte próprio, e o CSS é quem cuida do enquadramento. */}
      <div className="cena-derrota-ceu" />

      {/* Véu claro que fecha as frestas entre as nuvens. Sem ele a tela
          nunca fica 100% coberta (a arte tem fundo transparente) e a troca
          para o céu apareceria como um corte seco por entre os buracos. */}
      <div className="cena-derrota-veu" />

      {NUVENS.map((nuvem, i) => (
        <img
          key={i}
          src={nuvemImg}
          alt=""
          className="cena-derrota-nuvem"
          style={{
            left: nuvem.esquerda,
            top: nuvem.topo,
            width: nuvem.largura,
            '--entrada': ENTRADA[nuvem.lado],
            '--saida': SAIDA[nuvem.lado],
            transitionDelay: `${nuvem.atraso}ms`,
          }}
        />
      ))}

      {noCeu && (
        <>
          {/* Montado só agora, para a subida começar do zero no instante em
              que o céu aparece. */}
          <img src={bonecoParado} alt="" className="cena-derrota-fantasma" />
          <div className="cena-derrota-mensagem">
            <strong>Você perdeu…</strong>
            <span>Suas três vidas acabaram.</span>
          </div>
        </>
      )}

      {/* Clarão da batida, no primeiro tempo. Fica por último no DOM para
          piscar por cima de tudo; depois da animação some sozinho. */}
      <div className="cena-derrota-flash" />
    </div>
  );
}
