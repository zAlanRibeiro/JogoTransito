import useOrientacao, { ehDispositivoDeToque } from '../hooks/useOrientacao';
import { CelularIcon } from './HudIcons';

// Rede de segurança da rotação automática. O pedido de paisagem
// (useOrientacao.pedirPaisagem) só é atendido no Chrome/Android e em tela
// cheia; no iOS não existe API nenhuma para isso, e em qualquer aparelho o
// usuário pode sair da tela cheia e virar o aparelho de volta. Nesses casos
// este aviso assume: a arena é 600x400 e, em pé, sobra tela vazia em cima e
// embaixo enquanto o jogo encolhe para menos de um terço da tela.
export default function AvisoDeRotacao() {
  const emRetrato = useOrientacao();

  // Só em aparelho de toque: numa janela estreita de computador o jogo
  // continua perfeitamente jogável no teclado, e cobrir a tela ali seria só
  // atrapalhar.
  if (!ehDispositivoDeToque() || !emRetrato) return null;

  return (
    <div className="aviso-rotacao" role="alertdialog" aria-live="assertive">
      <CelularIcon size={56} />
      <strong>Vire o aparelho</strong>
      <span>A rua é deitada, e o jogo também. Gire o celular para começar.</span>
    </div>
  );
}
