import { useEffect, useState } from 'react';

// Orientação da tela e a tentativa de travar em paisagem.
//
// Não existe jeito de "girar a tela" por conta própria na web. O máximo que dá
// para fazer é PEDIR ao sistema, e só um caminho funciona:
//
//   screen.orientation.lock('landscape')  — exige estar em tela cheia e só
//   está implementado no Chrome/Android. O Safari do iOS não implementa nada
//   disso: no iPhone e no iPad a rotação continua sendo do usuário.
//
// Por isso o pedido é feito com try/catch e o jogo NÃO depende dele: quando
// falha (ou quando o usuário volta o aparelho para a vertical), sobra o aviso
// de "vire o aparelho", que funciona em qualquer navegador.

export function estaEmRetrato() {
  if (typeof window === 'undefined') return false;
  // matchMedia é mais confiável que comparar innerWidth/innerHeight: no meio
  // da rotação, e com o teclado virtual aberto, as medidas mentem.
  if (window.matchMedia) return window.matchMedia('(orientation: portrait)').matches;
  return window.innerHeight > window.innerWidth;
}

export function ehDispositivoDeToque() {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Tenta deixar o aparelho em paisagem. Precisa ser chamada de dentro de um
 * gesto do usuário (o toque em "INICIAR JOGO"), senão o navegador recusa a
 * tela cheia. Falhar é esperado — em iOS falha sempre — e não quebra nada.
 */
export async function pedirPaisagem() {
  if (!ehDispositivoDeToque()) return false;
  try {
    const elemento = document.documentElement;
    if (!document.fullscreenElement && elemento.requestFullscreen) {
      await elemento.requestFullscreen({ navigationUI: 'hide' });
    }
    if (window.screen?.orientation?.lock) {
      await window.screen.orientation.lock('landscape');
      return true;
    }
  } catch {
    // Navegador sem suporte, ou usuário recusou a tela cheia: segue o aviso.
  }
  return false;
}

/** Acompanha a orientação em tempo real, para mostrar/esconder o aviso. */
export default function useOrientacao() {
  const [emRetrato, setEmRetrato] = useState(estaEmRetrato);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const consulta = window.matchMedia('(orientation: portrait)');
    const aoMudar = () => setEmRetrato(estaEmRetrato());

    consulta.addEventListener('change', aoMudar);
    // orientationchange cobre navegadores que demoram a atualizar a media
    // query durante a rotação.
    window.addEventListener('orientationchange', aoMudar);

    return () => {
      consulta.removeEventListener('change', aoMudar);
      window.removeEventListener('orientationchange', aoMudar);
    };
  }, []);

  return emRetrato;
}
