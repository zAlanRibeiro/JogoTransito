import { useSyncExternalStore } from 'react';
import { estaMudo, alternarMudo, assinarMudo } from '../audio/motorDeAudio';

// O estado de mudo mora no motor de áudio (fora do React), porque quem
// precisa dele são funções chamadas de dentro de efeitos e timers, não só
// componentes. useSyncExternalStore é a ponte oficial pra isso: o botão do
// HUD acompanha o valor real sem que ele precise virar estado do React.
export default function useSom() {
  const mudo = useSyncExternalStore(assinarMudo, estaMudo, estaMudo);
  return { mudo, alternarMudo };
}
