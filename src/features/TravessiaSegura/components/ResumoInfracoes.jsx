import { InfractionIcon } from './HudIcons';
import {
  LABELS_INFRACAO,
  TIPOS_POR_GRAVIDADE,
  totalDeInfracoes,
  totalPorGravidade,
} from '../infracoes';

/**
 * Relatório da partida agrupado por gravidade. Compartilhado pelas telas de
 * fim de jogo e de vitória — manter duas cópias faria as duas divergirem na
 * primeira vez que uma infração nova fosse criada.
 */
export default function ResumoInfracoes({ infracoes, className = '' }) {
  const total = totalDeInfracoes(infracoes);

  return (
    <div className={`infracoes-resumo ${className}`}>
      <h4><InfractionIcon size={14} /> Resumo da travessia</h4>

      {total === 0 ? (
        <p className="infracoes-limpo">Nenhuma infração. Travessia impecável!</p>
      ) : (
        ['leve', 'grave'].map((gravidade) => {
          const totalDoGrupo = totalPorGravidade(infracoes, gravidade);
          if (totalDoGrupo === 0) return null;

          return (
            <div key={gravidade} className={`infracoes-grupo infracoes-grupo--${gravidade}`}>
              <p className="infracoes-grupo-titulo">
                {gravidade === 'leve' ? 'Leves (tiraram pontos)' : 'Pesadas (tiraram vida)'}:{' '}
                <strong>{totalDoGrupo}x</strong>
              </p>
              <ul>
                {TIPOS_POR_GRAVIDADE[gravidade]
                  .filter((tipo) => infracoes[tipo] > 0)
                  .map((tipo) => (
                    <li key={tipo}>
                      {LABELS_INFRACAO[tipo]}: <strong>{infracoes[tipo]}x</strong>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
