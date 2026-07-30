import GameArena from './features/TravessiaSegura/GameArena';
import AvisoDeRotacao from './features/TravessiaSegura/components/AvisoDeRotacao';
import './App.css';

export default function App() {
  return (
    <div className="app-container">
      <GameArena />
      {/* Fora da arena de propósito: a arena é escalada por zoom e, em pé,
          ocupa menos de um terço da tela — o aviso precisa cobrir tudo. */}
      <AvisoDeRotacao />
    </div>
  );
}
