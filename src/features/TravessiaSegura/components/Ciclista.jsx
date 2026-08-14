import { SEGMENT_HEIGHT } from '../gameGrid';
import { duracaoParaALargura } from '../velocidadeDoTransito';

// A bicicleta que passa na ciclovia. É trânsito como qualquer outro veículo,
// com duas diferenças que são a razão de ela existir no jogo:
//
//   1. NÃO para no sinal. É a lição: sinal verde para o pedestre não quer
//      dizer via livre — a ciclovia continua correndo, e é preciso olhar.
//   2. Anda na faixa vermelha, na beirada da rua, e não no meio do asfalto.
//
// Quem decide QUAIS ruas têm ciclovia é bicicleta.js; aqui é só o desenho.

// Largura de um quadro da folha de sprites, em coordenadas da arena. O
// desenho aponta para CIMA (como o da moto), então o rotate(90deg) do CSS é
// que o põe andando para a direita: a "largura" daqui vira a ALTURA da
// bicicleta na pista, e o comprimento sai da proporção do quadro.
const LARGURA_DO_QUADRO = 44;

// Proporção de um quadro na folha: 677/4 de largura por 369 de altura.
const LARGURA_NA_FOLHA = 677 / 4;
const PROPORCAO_DO_QUADRO = 369 / LARGURA_NA_FOLHA;
const ALTURA_DO_QUADRO = LARGURA_DO_QUADRO * PROPORCAO_DO_QUADRO;

// A bicicleta não preenche o quadro: na folha ela ocupa as colunas 33 a 132
// (o resto é a folga que o cabelo usa para balançar). Depois do rotate(90°)
// a coluna da DIREITA do quadro vira a borda de BAIXO na tela, então é essa
// fração que diz onde a bicicleta desenhada termina.
const BORDA_DE_BAIXO_DO_DESENHO = 132 / LARGURA_NA_FOLHA;

// A bicicleta anda colada na calçada — que é onde fica a faixa vermelha da
// textura da ciclovia, e onde ciclovia de verdade corre. Encostar é a parte
// que importa para o jogo: o perigo está no primeiro passo fora do meio-fio.
const DESLOCAMENTO_ATE_A_BORDA = (BORDA_DE_BAIXO_DO_DESENHO - 0.5) * LARGURA_DO_QUADRO;

// Uma folga pequena antes do meio-fio. Ela é de jogabilidade, não de
// desenho: quem espera o sinal encostado na guia para exatamente na beirada
// da ciclovia, e sem esta folga a bicicleta atropelaria quem está fazendo
// certo — parado, esperando. Com ela, quem espera fica a salvo e quem dá o
// primeiro passo para dentro da rua é quem entra na frente da bicicleta.
const FOLGA_DO_MEIO_FIO = 4;
const CENTRO_NA_PISTA = SEGMENT_HEIGHT - DESLOCAMENTO_ATE_A_BORDA - FOLGA_DO_MEIO_FIO;

// O elemento é posicionado pelo canto, mas o rotate(90deg) gira em torno do
// CENTRO do quadro — é o centro que precisa cair no lugar certo da pista.
const TOPO = CENTRO_NA_PISTA - ALTURA_DO_QUADRO / 2;

// Bicicleta é mais lenta que carro: ~1,8x o tempo de travessia dele. Não é
// só realismo — dá ao jogador tempo de ver que vem alguém pela ciclovia.
const MULTIPLICADOR_DE_DURACAO = 1.8;

export default function Ciclista({ seed = 0, duracaoCarro = 4, larguraDaArena = 600, registerRef }) {
  const duracao = duracaoParaALargura(duracaoCarro * MULTIPLICADOR_DE_DURACAO, larguraDaArena);

  // Mesmo truque do Vehicle: um adiantamento por rua espalha as bicicletas
  // pela tela em vez de fazer todas nascerem juntas na borda esquerda.
  const atraso = `-${(Math.abs(Math.sin(seed)) * duracao).toFixed(2)}s`;

  return (
    <div className="street-lane">
      {/* Sempre `moving`: a bicicleta não tem o estado `stopped` do carro,
          porque ela não para no sinal. As pausas do jogo (menu de pausa e
          cutscene de derrota) continuam valendo, por regra de CSS. */}
      <div
        className="vehicle moving"
        style={{ animationDelay: atraso, animationDuration: `${duracao}s`, top: `${TOPO}px` }}
      >
        <div
          className="ciclista"
          ref={registerRef}
          style={{ '--ciclista-quadro': `${LARGURA_DO_QUADRO}px` }}
          // Ela atropela pela linha dos PÉS do boneco, e não pela caixa dele
          // (ver usePlayerMovement): corre rente ao chão, na beirada da
          // pista, e contra a caixa passaria por baixo sem nunca encostar.
          data-atropela-pelos-pes="1"
          // A caixa do quadro é bem maior que a bicicleta desenhada dentro
          // dela (a folha reserva espaço para o cabelo balançar). Sem estas
          // margens, o radar de colisão usaria as do carro — calibradas para
          // um sprite de outra proporção — e a bicicleta atropelaria de
          // longe. A margem de cima e de baixo é generosa de propósito: ela
          // é o que garante que quem espera na guia não seja atingido.
          data-margem-x="4"
          data-margem-y="24"
        />
      </div>
    </div>
  );
}
