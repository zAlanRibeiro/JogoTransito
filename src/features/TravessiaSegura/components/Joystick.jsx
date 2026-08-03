import { useRef, useState } from 'react';

// Joystick virtual do celular. Substitui o esquema anterior de zonas
// invisíveis (segurar a tela andava para a frente; os quadrantes de baixo
// andavam para os lados), que tinha dois problemas de fundo: as fronteiras
// não apareciam na tela, e não havia como andar para TRÁS — o teclado tem S
// e seta para baixo, o toque não tinha nada.
//
// O controle devolve as quatro direções, e não uma velocidade proporcional
// à distância do centro. É de propósito: a velocidade do jogador (4px por
// quadro) é a mesma em que as margens de colisão foram calibradas, e um
// controle analógico mudaria o jogo inteiro junto, não só o controle.

// Raio do berço e o quanto a alavanca pode se afastar do centro, em px da
// arena (a escala da arena se aplica por cima, como em todo o resto).
const RAIO_DA_BASE = 52;
const RAIO_DA_ALAVANCA = 22;
const DESLOCAMENTO_MAXIMO = RAIO_DA_BASE - RAIO_DA_ALAVANCA;

// Abaixo disto o toque conta como "centro" e nada se move. Sem essa zona
// morta, encostar o polegar já empurraria o boneco para algum lado, e ele
// nunca ficaria parado na calçada esperando o sinal — que é justamente o que
// o jogo quer ensinar.
const ZONA_MORTA = 0.28;

const PARADO = { frente: false, tras: false, esquerda: false, direita: false };

/**
 * @param aoMudar  recebe { frente, tras, esquerda, direita } a cada mudança.
 *                 Quem chama guarda isso numa ref: o joystick muda dezenas
 *                 de vezes por segundo e não pode custar um render do jogo
 *                 a cada movimento do dedo.
 */
export default function Joystick({ aoMudar }) {
  const baseRef = useRef(null);
  const ponteiroRef = useRef(null);
  const direcaoRef = useRef(PARADO);
  const [alavanca, setAlavanca] = useState({ x: 0, y: 0 });
  const [ativo, setAtivo] = useState(false);

  const publicar = (direcao) => {
    const anterior = direcaoRef.current;
    // Só avisa quando alguma direção realmente virou, e não a cada pixel:
    // o consumidor escreve numa ref, mas comparar aqui evita trabalho à toa
    // sessenta vezes por segundo.
    if (
      anterior.frente === direcao.frente &&
      anterior.tras === direcao.tras &&
      anterior.esquerda === direcao.esquerda &&
      anterior.direita === direcao.direita
    ) {
      return;
    }
    direcaoRef.current = direcao;
    aoMudar(direcao);
  };

  const mover = (evento) => {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    // A arena é escalada por zoom; getBoundingClientRect já vem escalado, e
    // dividir pelo tamanho real devolve a posição em fração do raio — que é
    // o que importa aqui, independente da escala.
    const dx = (evento.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (evento.clientY - (r.top + r.height / 2)) / (r.height / 2);

    const distancia = Math.hypot(dx, dy);
    const limite = Math.min(distancia, 1);
    const fator = distancia > 0 ? limite / distancia : 0;
    setAlavanca({ x: dx * fator * DESLOCAMENTO_MAXIMO, y: dy * fator * DESLOCAMENTO_MAXIMO });

    if (distancia < ZONA_MORTA) {
      publicar(PARADO);
      return;
    }

    // Y da tela cresce para BAIXO; "frente" no jogo é para cima.
    // O limiar de 0.4 do eixo dominante é o que permite a diagonal: com um
    // corte por octante puro, andar na diagonal exigiria mira fina demais
    // para um polegar.
    const eixo = Math.max(Math.abs(dx), Math.abs(dy));
    const corte = eixo * 0.4;
    publicar({
      frente: dy < -corte,
      tras: dy > corte,
      esquerda: dx < -corte,
      direita: dx > corte,
    });
  };

  const soltar = (evento) => {
    if (ponteiroRef.current !== evento.pointerId) return;
    ponteiroRef.current = null;
    setAtivo(false);
    setAlavanca({ x: 0, y: 0 });
    publicar(PARADO);
  };

  return (
    <div
      ref={baseRef}
      className={`joystick ${ativo ? 'joystick--ativo' : ''}`}
      role="application"
      aria-label="Controle de direção"
      onPointerDown={(evento) => {
        // O toque NÃO é barrado aqui de propósito: ele precisa subir até a
        // arena, onde `destravarAudio` roda. Os navegadores só liberam áudio
        // dentro de um gesto do usuário, e uma aba que volta do segundo plano
        // devolve o contexto suspenso — quem jogasse só pelo joystick ficaria
        // sem som para sempre. Como o handler da arena não anda mais (o
        // joystick tomou esse lugar), deixar borbulhar não tem efeito
        // colateral.
        // Captura o ponteiro: sem isto, arrastar o polegar para fora do
        // berço faria o navegador entregar os eventos a outro elemento e o
        // boneco continuaria andando para sempre na última direção.
        evento.currentTarget.setPointerCapture(evento.pointerId);
        ponteiroRef.current = evento.pointerId;
        setAtivo(true);
        mover(evento);
      }}
      onPointerMove={(evento) => {
        if (ponteiroRef.current !== evento.pointerId) return;
        mover(evento);
      }}
      onPointerUp={soltar}
      // O cancel é o caso do sistema tomar o toque (notificação, ligação, o
      // gesto de voltar do Android): o pointerup nunca chega, e sem tratar
      // isto o jogador segue andando sozinho até tocar a tela de novo.
      onPointerCancel={soltar}
      onLostPointerCapture={soltar}
    >
      <span className="joystick__alavanca" style={{ transform: `translate(${alavanca.x}px, ${alavanca.y}px)` }} />
    </div>
  );
}
